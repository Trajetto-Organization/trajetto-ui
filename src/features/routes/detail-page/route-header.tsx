"use client";

import { useState } from "react";
import { CalendarDays, Flag, Truck, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type { RouteDetail } from "@/actions/route/get-route";
import { formatDateOnly, formatNotificationDate } from "@/lib/format-values";

import { RouteFormDialog } from "../form-dialog";
import { CancelRouteDialog } from "../cancel-dialog";

import { ROUTE_STATUS_META, canUnreleaseRoute } from "../lib/status";
import { formatPlannedWindow } from "../lib/route-dates";
import {
  cancelBlocker,
  editBlocker,
  releaseBlocker,
  type Permission,
} from "../lib/route-blockers";

interface RouteHeaderProps {
  businessId: string;
  route: RouteDetail;
  progress: { done: number; total: number };
  permission: Permission;

  /** An unsaved order: releasing now would hand over the old one. */
  hasUnsavedOrder: boolean;

  onRelease: (released: boolean) => Promise<void>;

  /** After an edit or a cancellation, so the page reads the route again. */
  onChanged: () => void;

  /** The edit met a newer plan (409 ROUTE_PLAN_STALE): the page reloads. */
  onConflict: (message: string) => Promise<void>;
}

interface GatedButtonProps {
  label: string;
  blockedReason: string | null;
  onClick: () => void;
  variant?: "default" | "outline" | "destructive";
  busy?: boolean;
}

/** A button that stays visible when blocked, and says why on hover/focus. */
const GatedButton = ({
  label,
  blockedReason,
  onClick,
  variant = "outline",
  busy = false,
}: GatedButtonProps): JSX.Element => (
  <TooltipProvider delayDuration={100}>
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={blockedReason ? 0 : -1} className="w-full sm:w-auto">
          <Button
            size="sm"
            variant={variant}
            className="w-full sm:w-auto"
            disabled={Boolean(blockedReason) || busy}
            onClick={onClick}
          >
            {label}
          </Button>
        </span>
      </TooltipTrigger>
      {blockedReason && (
        <TooltipContent className="max-w-xs">
          <p>{blockedReason}</p>
        </TooltipContent>
      )}
    </Tooltip>
  </TooltipProvider>
);

interface FactProps {
  icon: typeof Truck;
  label: string;
  children: React.ReactNode;
}

const Fact = ({ icon: Icon, label, children }: FactProps): JSX.Element => (
  <div className="min-w-0 space-y-1">
    <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {label}
    </dt>
    <dd className="text-sm font-medium break-words">{children}</dd>
  </div>
);

/**
 * Who drives the route, in what, when and where to — and the acts on it
 * (decision 14.7, §5.2): Editar, Liberar / Voltar ao planejamento, Cancelar,
 * with the board's own blockers (lib/route-blockers).
 */
const RouteHeader = ({
  businessId,
  route,
  progress,
  permission,
  hasUnsavedOrder,
  onRelease,
  onChanged,
  onConflict,
}: RouteHeaderProps): JSX.Element => {
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [isCancelOpen, setIsCancelOpen] = useState<boolean>(false);
  const [isReleasing, setIsReleasing] = useState<boolean>(false);

  const meta = ROUTE_STATUS_META[route.status];

  const planned = formatPlannedWindow(
    route.planned_departure_at,
    route.planned_arrival_at,
  );

  const unreleasable = canUnreleaseRoute(route.status);

  const release = async (released: boolean) => {
    setIsReleasing(true);

    try {
      await onRelease(released);
    } finally {
      setIsReleasing(false);
    }
  };

  // The release hands over the plan the API has; an order on screen that was
  // not saved would not go with it.
  const releaseReason =
    releaseBlocker(route, permission) ??
    (hasUnsavedOrder ? "Salve a ordem das paradas antes de liberar." : null);

  // An edit while the order is unsaved would come back as a plan change
  // under the dispatcher's hands; save or discard first.
  const editReason =
    editBlocker(route, permission) ??
    (hasUnsavedOrder
      ? "Salve ou descarte a ordem das paradas antes de editar a rota."
      : null);

  return (
    <section
      aria-label="Rota"
      className="space-y-4 rounded-lg border bg-card p-4"
      data-tutorial="route-header"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {/* "Rota 12 — Zona Leste" (§5.1): the code and the name are the
            route's identity, read together. */}
        <h2 className="min-w-0 break-words text-xl font-semibold">
          Rota {route.code}
          {route.name && (
            <span className="font-normal text-muted-foreground">
              {" "}
              — {route.name}
            </span>
          )}
        </h2>

        <Badge variant="outline" className={meta.badgeClassName}>
          {meta.label}
        </Badge>

        <span className="text-sm text-muted-foreground">
          {progress.total === 0
            ? "Sem paradas"
            : `${progress.done} de ${progress.total} resolvidas`}
        </span>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Fact icon={UserRound} label="Motorista">
          {route.driver?.name ?? "—"}
        </Fact>

        <Fact icon={Truck} label="Veículo">
          {route.vehicle ? (
            route.vehicle.license_plate
          ) : (
            <span className="text-amber-700 dark:text-amber-400">
              Sem veículo — obrigatório para liberar
            </span>
          )}
        </Fact>

        <Fact icon={CalendarDays} label="Data e horários">
          {/* A civil day (decision 1.3); the window on this screen's clock. */}
          {formatDateOnly(route.scheduled_date, { fallback: "—" })}
          {planned && (
            <span className="block text-muted-foreground font-normal">
              Previsto: {planned}
            </span>
          )}
          {route.started_at && (
            <span className="block text-muted-foreground font-normal">
              Saiu: {formatNotificationDate(route.started_at)}
            </span>
          )}
          {route.completed_at && (
            <span className="block text-muted-foreground font-normal">
              Concluída: {formatNotificationDate(route.completed_at)}
            </span>
          )}
        </Fact>

        <Fact icon={Flag} label="Destino">
          {route.destination ?? (
            <span className="text-muted-foreground font-normal">
              Não informado
            </span>
          )}
        </Fact>
      </dl>

      {route.cancellation_reason && (
        <p className="text-sm text-muted-foreground">
          Motivo do cancelamento: {route.cancellation_reason}
        </p>
      )}

      <div
        className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"
        data-tutorial="route-actions"
      >
        <GatedButton
          label="Editar rota"
          blockedReason={editReason}
          onClick={() => setIsEditOpen(true)}
        />

        {unreleasable ? (
          <GatedButton
            label="Voltar ao planejamento"
            blockedReason={permission.canWrite ? null : permission.message}
            busy={isReleasing}
            onClick={() => void release(false)}
          />
        ) : (
          <GatedButton
            label="Liberar para o motorista"
            variant="default"
            blockedReason={releaseReason}
            busy={isReleasing}
            onClick={() => void release(true)}
          />
        )}

        <GatedButton
          label="Cancelar rota"
          variant="destructive"
          blockedReason={cancelBlocker(route, permission)}
          onClick={() => setIsCancelOpen(true)}
        />
      </div>

      {isEditOpen && (
        <RouteFormDialog
          businessId={businessId}
          route={route}
          isOpen={isEditOpen}
          onClose={() => {
            setIsEditOpen(false);
            onChanged();
          }}
          onConflict={onConflict}
        />
      )}

      {isCancelOpen && (
        <CancelRouteDialog
          businessId={businessId}
          route={route}
          isOpen={isCancelOpen}
          onClose={() => {
            setIsCancelOpen(false);
            onChanged();
          }}
        />
      )}
    </section>
  );
};

export { RouteHeader };
