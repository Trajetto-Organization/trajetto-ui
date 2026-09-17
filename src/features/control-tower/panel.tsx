"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "react-query";

import dynamic from "next/dynamic";

import { RefreshCw, Truck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { getSocket, initializeSocket } from "@/socket";

import { useOperationsSubscription } from "@/hooks/use-operations-subscription";

import {
  getControlTower,
  getDriverTrail,
  type TowerPosition,
} from "@/actions/control-tower";

import {
  EventsWidget,
  FunnelWidget,
  ProgressWidget,
  PunctualityWidget,
} from "./widgets";

/**
 * Leaflet touches `window` at import time, so the map can never be part of the
 * server bundle. `ssr: false` and not a `typeof window` guard: a guard would
 * still pull the whole library into the server build for a component that
 * cannot run there.
 */
const TowerMap = dynamic(
  () => import("./map").then((module) => module.TowerMap),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[480px] w-full rounded-lg" />,
  },
);

interface ControlTowerPanelProps {
  businessId: string;
}

/**
 * How often the numbers are refetched.
 *
 * Thirty seconds. The dots move over the socket the instant a phone reports,
 * so this is only for the counters — and a dispatcher who leaves this open all
 * day would otherwise make 2.880 requests a shift for a funnel that changes a
 * few times an hour.
 */
const REFRESH_MS = 30_000;

const POSITION_EVENT = "driverPosition";

interface PositionEvent {
  driverId: string;
  routeId: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  recordedAt: string;
}

function isPositionEvent(value: unknown): value is PositionEvent {
  if (!value || typeof value !== "object") return false;

  const event = value as Record<string, unknown>;

  return (
    typeof event.driverId === "string" &&
    typeof event.latitude === "number" &&
    typeof event.longitude === "number" &&
    typeof event.recordedAt === "string"
  );
}

const ControlTowerPanel = ({
  businessId,
}: ControlTowerPanelProps): JSX.Element => {
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  // Positions travel in a room with a permission check on it. A user who
  // belongs to this company was put there at handshake time; a MASTER was
  // not, because they belong to no company — and neither is anyone whose
  // socket reconnected since, because a room dies with its connection.
  useOperationsSubscription(businessId || undefined);

  /**
   * Dots that arrived over the socket since the last refetch.
   *
   * Merged over the fetched list rather than replacing it: the socket carries
   * a position and nothing else — no name, no plate, no route code — and a
   * screen that showed the socket's version alone would blank the labels of
   * every truck that moved.
   */
  const [live, setLive] = useState<Record<string, PositionEvent>>({});

  const { data, isLoading, isFetching, refetch } = useQuery(
    ["control_tower", businessId],
    () => getControlTower(businessId || undefined),
    { refetchOnWindowFocus: false, refetchInterval: REFRESH_MS },
  );

  const tower = data?.data;

  const { data: trailResponse } = useQuery(
    ["driver_trail", businessId, selectedDriverId],
    () =>
      getDriverTrail(selectedDriverId as string, {
        businessId: businessId || undefined,
      }),
    { enabled: Boolean(selectedDriverId), refetchOnWindowFocus: false },
  );

  const socketBound = useRef<boolean>(false);

  useEffect(() => {
    if (!businessId || socketBound.current) return;

    let disposed = false;

    const handle = (incoming: unknown) => {
      if (disposed || !isPositionEvent(incoming)) return;

      setLive((current) => ({ ...current, [incoming.driverId]: incoming }));
    };

    const bind = async () => {
      const socket = getSocket() ?? (await initializeSocket());

      if (disposed) return;

      socket.on(POSITION_EVENT, handle);
      socketBound.current = true;
    };

    void bind();

    return () => {
      disposed = true;

      getSocket()?.off(POSITION_EVENT, handle);
      socketBound.current = false;
    };
  }, [businessId]);

  // A refetch is the authority: it carries names, plates and freshness. The
  // socket's dots are only newer until the next one lands.
  useEffect(() => {
    if (!tower) return;

    setLive({});
  }, [tower]);

  const positions = useMemo<TowerPosition[]>(() => {
    const fetched = tower?.positions ?? [];

    return fetched.map((position) => {
      const update = live[position.driverId];

      if (!update) return position;

      return {
        ...position,
        latitude: update.latitude,
        longitude: update.longitude,
        speed: update.speed,
        heading: update.heading,
        recordedAt: update.recordedAt,

        // It arrived a moment ago, by definition.
        fresh: true,
      };
    });
  }, [tower, live]);

  const selected = positions.find(
    (position) => position.driverId === selectedDriverId,
  );

  const handleSelect = useCallback((driverId: string | null) => {
    setSelectedDriverId(driverId);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Truck className="h-3 w-3" />
            {positions.length}{" "}
            {positions.length === 1 ? "veículo" : "veículos"}
          </Badge>

          {positions.some((position) => !position.fresh) && (
            <Badge variant="secondary">
              {positions.filter((position) => !position.fresh).length} sem
              reportar há mais de 10 min
            </Badge>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-[480px] w-full rounded-lg" />
      ) : (
        <>
          <TowerMap
            positions={positions}
            trail={selectedDriverId ? (trailResponse?.data?.points ?? null) : null}
            selectedDriverId={selectedDriverId}
            onSelectDriver={handleSelect}
          />

          {selected && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
              <span className="font-medium">
                {selected.driverName ?? "Motorista"}
              </span>

              {selected.vehiclePlate && (
                <Badge variant="secondary">{selected.vehiclePlate}</Badge>
              )}

              {selected.routeCode !== null && (
                <span className="text-xs text-muted-foreground">
                  Rota {selected.routeCode}
                </span>
              )}

              {trailResponse?.data && (
                <span className="text-xs text-muted-foreground">
                  {/* The real count next to what was drawn: somebody seeing
                  only the drawn points would conclude the phone stopped
                  reporting. */}
                  {trailResponse.data.recorded.toLocaleString("pt-BR")} pontos
                  hoje
                  {trailResponse.data.recorded >
                    trailResponse.data.points.length &&
                    ` (${trailResponse.data.points.length} desenhados)`}
                </span>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDriverId(null)}
              >
                Fechar
              </Button>
            </div>
          )}
        </>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        {isLoading || !tower ? (
          <>
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </>
        ) : (
          <>
            <FunnelWidget funnel={tower.funnel} />

            <div className="space-y-3">
              <ProgressWidget progress={tower.progress} />
              <PunctualityWidget punctuality={tower.punctuality} />
            </div>

            <EventsWidget events={tower.events} />
          </>
        )}
      </div>
    </div>
  );
};

export { ControlTowerPanel, REFRESH_MS };
