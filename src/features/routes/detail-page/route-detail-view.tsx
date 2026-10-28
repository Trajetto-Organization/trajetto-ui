"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";
import { isStaleActionResult } from "@/lib/action-result";

import type {
  RouteDetailResult,
  RouteVisitedPoint,
} from "@/actions/route/get-route";
import {
  releaseRoute,
  removeRouteStops,
  reorderRouteStops,
  setDeliveryLocation,
} from "@/actions/route/route-operations";

import type { MapTiles } from "@/features/control-tower/lib/map-tiles";
import { FOREGROUND_ONLY_NOTICE } from "@/features/control-tower/lib/tracking-notice";

import { useRouteDetail } from "./hooks/use-route-detail";
import { useRoutePlan } from "./hooks/use-route-plan";
import { useLeaveGuard } from "./hooks/use-leave-guard";

import { RouteHeader } from "./route-header";
import { RouteStopsBoard } from "./route-stops-board";
import { AddDeliveriesSheet } from "./add-deliveries-sheet";
import { RouteConversations } from "./route-conversations";
import { EmptiedRouteDialog } from "./emptied-route-dialog";

import { addStopsBlocker, stopsBlocker } from "../lib/route-blockers";
import { isRouteEditable } from "../lib/status";
import { isPlanConflict } from "../lib/plan-conflict";
import { UNSAVED_ORDER_MESSAGE } from "../lib/leave-guard";

/**
 * Leaflet touches `window` at import time, so the map is never part of the
 * server render — the tower does the same.
 */
/**
 * One empty list for a route without visited points: a fresh `[]` on every
 * render re-ran the map's stops effect on every ping of the driver.
 */
const NO_VISITED_POINTS: RouteVisitedPoint[] = [];

const RouteMap = dynamic(
  () => import("./route-map").then((module) => module.RouteMap),
  {
    ssr: false,
    loading: () => (
      <Skeleton
        data-tutorial="loading"
        className="h-[60vh] min-h-[320px] w-full rounded-lg md:h-[480px]"
      />
    ),
  },
);

interface RouteDetailViewProps {
  businessId: string;
  routeId: string;
  initial: RouteDetailResult;
  tiles: MapTiles | null;
  backgroundTracking: boolean;
  admin: boolean;
}

/**
 * The route's page (decision 14.7): who drives it and in what, the deliveries
 * in the order the driver will follow (dragged, or moved with the buttons and
 * the keyboard), the picker of deliveries without a route, the map with the
 * stops and the driver, and the release.
 */
const RouteDetailView = ({
  businessId,
  routeId,
  initial,
  tiles,
  backgroundTracking,
  admin,
}: RouteDetailViewProps): JSX.Element => {
  const holdRef = useRef<boolean>(false);

  const detail = useRouteDetail({
    businessId,
    routeId,
    initial,
    admin,
    holdRef,
  });

  const route = detail.data.route;
  const progress = detail.data.progress;
  const planVersion = route.plan_version;

  // The server's order follows every read; the local one sits on top of it.
  const serverIds = useMemo(
    () => route.stops.map((stop) => stop.id),
    [route.stops],
  );

  const plan = useRoutePlan(serverIds);

  holdRef.current = plan.dirty;

  // A dragged order that was not saved is lost on leaving: ask first.
  useLeaveGuard(plan.dirty, UNSAVED_ORDER_MESSAGE);

  const permissionsRequired = useCheckMultiplePermissions([
    {
      key: permissions.DELIVERY_MANAGE,
      action: "write",
      label: getPermissionName(permissions.DELIVERY_MANAGE),
    },
  ]);

  const permission = {
    canWrite: permissionsRequired.hasAllPermissions,
    message: permissionsRequired.tooltipMessage,
  };

  const editable = isRouteEditable(route.status);

  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isRemoving, setIsRemoving] = useState<boolean>(false);
  const [emptied, setEmptied] = useState<boolean>(false);

  const [pinning, setPinning] = useState<{
    deliveryId: string;
    label: string;
  } | null>(null);

  const [highlightedStopId, setHighlightedStopId] = useState<string | null>(
    null,
  );

  /** Somebody else changed the plan: reload, say so, keep nothing local. */
  const handleConflict = useCallback(
    async (message: string) => {
      toast.error(message, {
        description: "Recarregamos a rota atual. Confira e refaça a alteração.",
      });

      plan.discard();
      await detail.reload();
    },
    [plan, detail],
  );

  const saveOrder = async () => {
    setIsSaving(true);

    try {
      const answer = await detail.trackWrite(async (adopt) => {
        const result = await reorderRouteStops(
          businessId,
          routeId,
          plan.orderedIds,
          planVersion,
        );

        if (result.success) adopt(result.data?.planVersion);

        return result;
      });

      if (isStaleActionResult(answer)) return;

      if (!answer.success) {
        if (isPlanConflict(answer.code)) {
          await handleConflict(answer.message);
          return;
        }

        toast.error(answer.message);
        return;
      }

      toast.success("Ordem das paradas salva.", {
        description:
          route.status === "RELEASED"
            ? "O motorista recebe a nova ordem no aplicativo."
            : undefined,
      });

      plan.discard();
      await detail.refetch();
    } finally {
      setIsSaving(false);
    }
  };

  const removeStops = async (stopIds: string[]) => {
    setIsRemoving(true);

    try {
      const answer = await detail.trackWrite(async (adopt) => {
        const result = await removeRouteStops(
          businessId,
          routeId,
          stopIds,
          planVersion,
        );

        if (result.success) adopt(result.data?.planVersion);

        return result;
      });

      if (isStaleActionResult(answer)) return false;

      if (!answer.success || !answer.data) {
        if (isPlanConflict(answer.code)) {
          await handleConflict(answer.message);
          return false;
        }

        toast.error(answer.message);
        return false;
      }

      const count = answer.data.removed.length;

      toast.success(
        count === 1
          ? "1 entrega retirada da rota."
          : `${count} entregas retiradas da rota.`,
      );

      plan.discard();
      await detail.refetch();

      // A released route left with nothing: the dispatcher decides (§4.4).
      if (answer.data.routeEmptied && route.status === "RELEASED")
        setEmptied(true);

      return true;
    } finally {
      setIsRemoving(false);
    }
  };

  const release = async (released: boolean) => {
    const answer = await detail.trackWrite(async (adopt) => {
      const result = await releaseRoute(
        businessId,
        routeId,
        released,
        planVersion,
      );

      if (result.success) adopt(result.data?.planVersion);

      return result;
    });

    if (isStaleActionResult(answer)) return;

    if (!answer.success) {
      if (isPlanConflict(answer.code)) {
        await handleConflict(answer.message);
        return;
      }

      toast.error(answer.message);
      return;
    }

    toast.success(answer.message);
    await detail.refetch();
  };

  const pinAt = async (point: { latitude: number; longitude: number }) => {
    if (!pinning) return;

    const target = pinning;

    setPinning(null);

    // The pin moves the plan version of the route holding the delivery.
    const answer = await detail.trackWrite(async (adopt) => {
      const result = await setDeliveryLocation(
        businessId,
        target.deliveryId,
        point,
      );

      if (result.success) adopt(result.data?.planVersion);

      return result;
    });

    if (isStaleActionResult(answer)) return;

    if (!answer.success) {
      toast.error(answer.message);
      return;
    }

    toast.success(`${target.label} fixada no mapa.`);
    await detail.refetch();
  };

  const stopsBlocked = stopsBlocker(route, permission);

  return (
    <div className="space-y-6">
      <RouteHeader
        businessId={businessId}
        route={route}
        progress={progress}
        permission={permission}
        hasUnsavedOrder={plan.dirty}
        onRelease={release}
        onChanged={() => void detail.refetch()}
        onConflict={handleConflict}
      />

      {detail.staleNotice && (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-lg border border-amber-300
          bg-amber-50 p-3 text-sm text-amber-900 sm:flex-row sm:items-center
          sm:justify-between dark:border-amber-700 dark:bg-amber-950
          dark:text-amber-100"
        >
          <p className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Esta rota foi alterada por outra pessoa enquanto você mudava a
            ordem.
          </p>

          <Button
            size="sm"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => {
              plan.discard();
              void detail.reload();
            }}
          >
            <RefreshCw className="mr-1 h-4 w-4" aria-hidden />
            Recarregar
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <RouteStopsBoard
          stops={route.stops}
          orderedIds={plan.orderedIds}
          dirty={plan.dirty}
          editable={editable && permission.canWrite}
          blockedReason={stopsBlocked}
          addBlockedReason={addStopsBlocker(route, permission)}
          released={route.status === "RELEASED"}
          isSaving={isSaving}
          isRemoving={isRemoving}
          highlightedStopId={highlightedStopId}
          onHighlight={setHighlightedStopId}
          onMove={plan.move}
          onSave={() => void saveOrder()}
          onDiscard={plan.discard}
          onRemove={removeStops}
          onOpenPicker={() => setIsPickerOpen(true)}
          onPin={(deliveryId, label) => setPinning({ deliveryId, label })}
        />

        <div className="space-y-2">
          <RouteMap
            tiles={tiles}
            stops={route.stops}
            orderedIds={plan.orderedIds}
            driverPosition={detail.driverPosition}
            driverLabel={
              route.vehicle?.license_plate ?? route.driver?.name ?? "Motorista"
            }
            visitedPoints={route.visitedPoints ?? NO_VISITED_POINTS}
            businessId={businessId}
            routeId={route.id}
            driverId={route.driverId}
            showTrail={
              route.status === "IN_PROGRESS" || route.status === "COMPLETED"
            }
            highlightedStopId={highlightedStopId}
            onHighlight={setHighlightedStopId}
            pinning={pinning}
            canPin={editable && permission.canWrite}
            onStartPin={(deliveryId, label) =>
              setPinning({ deliveryId, label })
            }
            onCancelPin={() => setPinning(null)}
            onPin={(point) => void pinAt(point)}
          />

          {!backgroundTracking && (
            <p className="text-xs text-muted-foreground">
              {FOREGROUND_ONLY_NOTICE}
            </p>
          )}
        </div>
      </div>

      <RouteConversations
        businessId={businessId}
        route={{ id: route.id, code: route.code, driver: route.driver }}
      />

      {isPickerOpen && (
        <AddDeliveriesSheet
          businessId={businessId}
          route={route}
          open={isPickerOpen}
          onOpenChange={setIsPickerOpen}
          onConflict={handleConflict}
          trackWrite={detail.trackWrite}
          onAdded={async () => {
            plan.discard();
            await detail.refetch();
          }}
        />
      )}

      <EmptiedRouteDialog
        open={emptied}
        onOpenChange={setEmptied}
        businessId={businessId}
        route={route}
        onUnrelease={async () => {
          setEmptied(false);
          await release(false);
        }}
        onCancelled={() => {
          setEmptied(false);
          void detail.refetch();
        }}
      />
    </div>
  );
};

export { RouteDetailView };
