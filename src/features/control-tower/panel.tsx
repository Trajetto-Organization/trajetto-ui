"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "react-query";

import dynamic from "next/dynamic";

import {
  AlertTriangle,
  Info,
  Radio,
  RefreshCw,
  Truck,
  WifiOff,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/custom/empty-state";
import { AccessErrorState } from "@/components/shared/custom/access-error-state";
import { ManageModulesButton } from "@/components/shared/custom/access-error-state/manage-modules-button";

import { getSocket, initializeSocket, onRealtimeResync } from "@/socket";

import { useOperationsSubscription } from "@/hooks/use-operations-subscription";

import { getControlTower, getDriverTrail } from "@/actions/control-tower";
import type { TowerPosition } from "@/actions/control-tower/types";
import { STALE_ACTION_MESSAGE, isStaleActionResult } from "@/lib/action-result";

import {
  ActiveRoutesWidget,
  EventsWidget,
  FunnelWidget,
  ProgressWidget,
  PunctualityWidget,
} from "./widgets";

import {
  applyLivePosition,
  hasUnknownDriver,
  mergeLivePosition,
  pruneLivePositions,
  type LiveUpdate,
} from "./lib/live-positions";
import type { MapTiles } from "./lib/map-tiles";
import { useRefetchScheduler } from "./lib/refetch-scheduler";
import { useTowerRefresh } from "./shell/refresh";
import { companyZoneNote, formatEventMoment } from "./lib/tower-format";
import { FOREGROUND_ONLY_NOTICE } from "./lib/tracking-notice";
import { OccurrenceAuthorizationQueue } from "@/features/deliveries/occurrence-authorizations/queue";
import {
  TowerRequestError,
  accessErrorOf,
  describeFailure,
  retryTransient,
  unwrapAnswer,
} from "./lib/tower-request";

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
    loading: () => (
      <Skeleton
        data-tutorial="loading"
        className="h-[60vh] min-h-[320px] w-full rounded-lg md:h-[480px]"
      />
    ),
  },
);

interface ControlTowerPanelProps {
  businessId: string;

  /** Where the event links open: the master's surface or the company's. */
  mode?: "admin" | "dashboard";

  /** The base map, read on the server per request (decision 7.4). */
  tiles?: MapTiles | null;

  /**
   * Whether the app reports from the background (decision 7.3). Off until
   * the Play Console declaration; while off, the panel says the tower sees
   * a driver only with the app open.
   */
  backgroundTracking?: boolean;
}

/** How often the dots age (fresh → sem reportar) between two reads. */
const CLOCK_TICK_MS = 30_000;

const POSITION_EVENT = "driverPosition";
const ROUTE_EVENT = "routeEvent";

interface PositionEvent extends LiveUpdate {
  driverId: string;
  routeId: string;
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

/**
 * The tower. Keyed by company in the content (decision 2.6): a master who
 * switches company gets a fresh panel — framing, selection and live dots of
 * the previous one included (UI-TWR-8).
 */
const ControlTowerPanel = ({
  businessId,
  mode = "dashboard",
  tiles = null,
  backgroundTracking = false,
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

  const [connected, setConnected] = useState<boolean>(false);

  const [now, setNow] = useState<number>(() => Date.now());

  // The Torre's cadence (1, 3 or 5 min, shell/refresh): its timer rereads
  // this panel's queries. The dots move over the socket the instant a phone
  // reports, and route events refetch at once; the timer is the floor.
  const { minutes } = useTowerRefresh();

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);

    return () => clearInterval(timer);
  }, []);

  const towerQuery = useQuery(
    ["control_tower", businessId],
    async () => {
      const answer = await getControlTower(businessId || undefined);

      if (isStaleActionResult(answer, { background: true })) {
        throw new TowerRequestError(STALE_ACTION_MESSAGE);
      }

      // Thrown on a refusal or a failure: react-query keeps the last tower
      // on screen and exposes the error beside it (UI-TWR-1).
      return unwrapAnswer(answer);
    },
    {
      refetchOnWindowFocus: false,
      keepPreviousData: true,
      retry: retryTransient,
    },
  );

  const tower = towerQuery.data;
  const refetchTower = towerQuery.refetch;

  const trailQuery = useQuery(
    ["driver_trail", businessId, selectedDriverId],
    async () => {
      const answer = await getDriverTrail(selectedDriverId as string, {
        businessId: businessId || undefined,
      });

      if (isStaleActionResult(answer, { background: true })) {
        throw new TowerRequestError(STALE_ACTION_MESSAGE);
      }

      return unwrapAnswer(answer);
    },
    {
      enabled: Boolean(selectedDriverId),
      refetchOnWindowFocus: false,
      retry: retryTransient,
    },
  );

  const trail = trailQuery.data;
  const refetchTrail = trailQuery.refetch;

  /**
   * One refetch for a burst of reasons: a route event, a reconnection, a
   * driver the last read did not know — and never two within ten seconds
   * (lib/refetch-scheduler). The open trail comes along, so the line keeps
   * up with the dot.
   */
  const scheduleRefetch = useRefetchScheduler(() => {
    void refetchTower();

    if (selectedDriverId) void refetchTrail();
  });

  useEffect(() => {
    if (!businessId) return;

    let disposed = false;
    let bound: ReturnType<typeof getSocket> = null;

    const handlePosition = (incoming: unknown) => {
      if (disposed || !isPositionEvent(incoming)) return;

      // Out-of-order events are dropped: an older point never replaces a
      // newer one (see lib/live-positions).
      setLive((current) => mergeLivePosition(current, incoming));
    };

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    const bind = async () => {
      const socket = getSocket() ?? (await initializeSocket());

      if (disposed) return;

      bound = socket;

      socket.on(POSITION_EVENT, handlePosition);

      // A route started, a stop settled, a status moved by hand: the
      // counters and the feed changed, not only the dots.
      socket.on(ROUTE_EVENT, scheduleRefetch);

      socket.on("connect", handleConnect);
      socket.on("disconnect", handleDisconnect);

      setConnected(socket.connected);
    };

    void bind().catch(() => setConnected(false));

    // What a reconnection missed has no replay: read it again.
    const stopResync = onRealtimeResync(scheduleRefetch);

    return () => {
      disposed = true;

      stopResync();

      bound?.off(POSITION_EVENT, handlePosition);
      bound?.off(ROUTE_EVENT, scheduleRefetch);
      bound?.off("connect", handleConnect);
      bound?.off("disconnect", handleDisconnect);
    };
  }, [businessId, scheduleRefetch]);

  // A refetch is the authority: it carries names, plates and route states.
  // A socket dot only outlives it when recorded after the read's own point —
  // one that arrived while the read was in flight (lib/live-positions).
  useEffect(() => {
    if (!tower) return;

    setLive((current) => pruneLivePositions(current, tower.positions));
  }, [tower]);

  // Somebody started a route since the last read: their dot has no name,
  // plate or route until one, so ask for it now rather than in 30 s.
  useEffect(() => {
    if (tower && hasUnknownDriver(live, tower.positions)) scheduleRefetch();
  }, [live, tower, scheduleRefetch]);

  const positions = useMemo<TowerPosition[]>(
    () =>
      (tower?.positions ?? []).map((position) =>
        applyLivePosition(position, live[position.driverId], now),
      ),
    [tower, live, now],
  );

  const selected = positions.find(
    (position) => position.driverId === selectedDriverId,
  );

  const handleSelect = useCallback((driverId: string | null) => {
    setSelectedDriverId(driverId);
  }, []);

  const onStreet = positions.filter((position) => position.state !== "ended");
  const silent = positions.filter((position) => position.state === "silent");
  const ended = positions.filter((position) => position.state === "ended");

  const zoneNote = companyZoneNote(tower?.timeZone);

  const onMap = useMemo(
    () => new Set(positions.map((position) => position.driverId)),
    [positions],
  );

  if (!tower && towerQuery.isError) {
    const refusal = accessErrorOf(towerQuery.error);

    // A refusal says which one, like every other screen (decision 4.1): the
    // MASTER on a company without Entregas gets the way to enable it.
    if (refusal) {
      return (
        <AccessErrorState
          kind={refusal.kind}
          moduleLabel="Entregas"
          audience={mode === "admin" ? "master" : "company"}
          message={refusal.message}
          action={
            refusal.kind === "module-not-enabled" &&
            mode === "admin" &&
            businessId ? (
              <ManageModulesButton businessId={businessId} />
            ) : undefined
          }
        />
      );
    }

    const copy = describeFailure(towerQuery.error);

    return (
      <EmptyState
        icon={AlertTriangle}
        title={copy.title}
        description={copy.description}
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => void refetchTower()}
            disabled={towerQuery.isFetching}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {towerQuery.isError && tower && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-lg border border-amber-300
          bg-amber-50 p-3 text-sm text-amber-900 sm:flex-row sm:items-center
          sm:justify-between dark:border-amber-800 dark:bg-amber-950
          dark:text-amber-200"
        >
          <span>
            {describeFailure(towerQuery.error).title}. Mostrando os dados das{" "}
            {formatEventMoment(
              new Date(towerQuery.dataUpdatedAt).toISOString(),
              tower.day,
              tower.timeZone,
            )}
            .
          </span>

          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => void refetchTower()}
            disabled={towerQuery.isFetching}
          >
            Tentar novamente
          </Button>
        </div>
      )}

      <div
        className="flex flex-wrap items-center gap-2"
        data-tutorial="control-tower-status"
      >
        <Badge variant="outline" className="gap-1">
          <Truck className="h-3 w-3" />
          {onStreet.length} {onStreet.length === 1 ? "veículo" : "veículos"} em
          rota
        </Badge>

        {silent.length > 0 && (
          <Badge variant="secondary">
            {silent.length} sem reportar há mais de 10 min
          </Badge>
        )}

        {ended.length > 0 && (
          <Badge
            variant="outline"
            className="border-green-600 text-green-800 dark:text-green-300"
          >
            {ended.length}{" "}
            {ended.length === 1 ? "rota concluída" : "rotas concluídas"} nas
            últimas 2 h
          </Badge>
        )}

        <Badge
          variant="outline"
          className={`gap-1 ${connected ? "text-green-800 dark:text-green-300" : "text-muted-foreground"}`}
          title={
            connected
              ? "As posições chegam no instante em que o telefone envia."
              : `Sem conexão em tempo real: a torre se atualiza a cada ${minutes} min.`
          }
        >
          {connected ? (
            <Radio className="h-3 w-3" />
          ) : (
            <WifiOff className="h-3 w-3" />
          )}
          {connected ? "Ao vivo" : "Sem tempo real"}
        </Badge>

        {zoneNote && (
          <span className="text-xs text-muted-foreground">{zoneNote}</span>
        )}
      </div>

      {/* Decision 6.3: drivers waiting for the tower's answer, on top. */}
      <OccurrenceAuthorizationQueue businessId={businessId} />

      {/* On every read, not in a tooltip: a quiet dot otherwise reads as a
      stopped truck (decision 7.3). */}
      {!backgroundTracking && (
        <p
          role="note"
          className="flex items-start gap-2 text-xs text-muted-foreground"
          data-tutorial="control-tower-foreground-note"
        >
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{FOREGROUND_ONLY_NOTICE}</span>
        </p>
      )}

      {towerQuery.isLoading ? (
        <Skeleton
          data-tutorial="loading"
          className="h-[60vh] min-h-[320px] w-full rounded-lg md:h-[480px]"
        />
      ) : (
        <>
          <TowerMap
            positions={positions}
            trail={selectedDriverId ? (trail?.points ?? null) : null}
            selectedDriverId={selectedDriverId}
            onSelectDriver={handleSelect}
            tiles={tiles}
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
                  {selected.state === "ended" && selected.endedAt
                    ? ` · concluída às ${formatEventMoment(selected.endedAt, tower?.day, tower?.timeZone)}`
                    : ""}
                </span>
              )}

              {trail && (
                <span className="text-xs text-muted-foreground">
                  {/* The real count next to what was drawn: somebody seeing
                  only the drawn points would conclude the phone stopped
                  reporting. */}
                  {trail.recorded.toLocaleString("pt-BR")} pontos hoje
                  {trail.recorded > trail.points.length &&
                    ` (${trail.points.length} desenhados)`}
                </span>
              )}

              {trailQuery.isError && (
                <span className="text-xs text-destructive">
                  Não foi possível carregar o trajeto.
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

      {towerQuery.isLoading || !tower ? (
        <Skeleton data-tutorial="loading" className="h-24 w-full rounded-lg" />
      ) : (
        <ActiveRoutesWidget
          routes={tower.activeRoutes ?? []}
          onMap={onMap}
          now={now}
          day={tower.day}
          timeZone={tower.timeZone}
        />
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        {towerQuery.isLoading || !tower ? (
          <>
            <Skeleton
              data-tutorial="loading"
              className="h-40 w-full rounded-lg"
            />
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

            <EventsWidget
              events={tower.events}
              day={tower.day}
              timeZone={tower.timeZone}
              mode={mode}
              businessId={businessId}
            />
          </>
        )}
      </div>
    </div>
  );
};

export { ControlTowerPanel };
