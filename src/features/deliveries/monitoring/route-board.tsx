"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "react-query";

import Link from "next/link";

import {
  AlertTriangle,
  RefreshCw,
  Route as RouteIcon,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/custom/empty-state";
import { AccessErrorState } from "@/components/shared/custom/access-error-state";

import { getSocket, initializeSocket, onRealtimeResync } from "@/socket";
import { useOperationsSubscription } from "@/hooks/use-operations-subscription";

import type {
  MonitoredRoute,
  RouteMonitoringData,
} from "@/actions/control-tower/types";
import {
  accessErrorOf,
  describeFailure,
} from "@/features/control-tower/lib/tower-request";
import {
  companyZoneNote,
  deliveryHref,
  formatEventMoment,
} from "@/features/control-tower/lib/tower-format";
import { useRefetchScheduler } from "@/features/control-tower/lib/refetch-scheduler";

import { settledBoardPage } from "./lib/board-page";
import { fetchRouteMonitoring, retryBoardOnce } from "./lib/board-reads";
import {
  DOT_LABELS,
  applyStopOnTheWay,
  applyStopSettled,
  isStopOnTheWay,
  isStopSettled,
  onTheWayStopOf,
  stopDot,
  type StopDot,
} from "./lib/progress";

const PAGE_SIZE = 20;

const STATUS_LABELS: Record<MonitoredRoute["status"], string> = {
  PLANNED: "Planejada",
  RELEASED: "Liberada",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
};

const DOT_CLASSES: Record<StopDot, string> = {
  delivered: "bg-green-600 border-green-600",
  failed: "bg-red-600 border-red-600",
  pending: "bg-zinc-300 border-zinc-300 dark:bg-zinc-600 dark:border-zinc-600",
  arrived: "bg-zinc-300 border-amber-500 dark:bg-zinc-600",
  on_the_way: "bg-zinc-300 border-blue-500 dark:bg-zinc-600",
  cancelled: "bg-transparent border-dashed border-zinc-400",
};

interface RouteBoardProps {
  /** Only on /admin, where a master picks the company. */
  businessId?: string;
  mode: "admin" | "dashboard";
}

/**
 * The monitoring board by route (decision 6.6, DLVP-MON-1).
 *
 * Each route of the company's day, with its completion and one dot per
 * delivery in the route's order: green delivered, red not delivered, grey
 * pending (amber ring at the door, blue ring on the way). A stop that settles
 * repaints its dot from the socket event itself; anything else a route does
 * refetches the page.
 */
const RouteBoard = ({ businessId, mode }: RouteBoardProps): JSX.Element => {
  const [page, setPage] = useState<number>(1);

  const queryClient = useQueryClient();

  const queryKey = ["route_monitoring", businessId ?? "session", page];

  useOperationsSubscription(businessId);

  const board = useQuery(
    queryKey,
    // A relay GET (lib/board-reads): a burst of route events no longer
    // queues it behind the page's other reads.
    ({ signal }) =>
      fetchRouteMonitoring(
        { businessId, page, pageSize: PAGE_SIZE },
        { signal },
      ),
    {
      keepPreviousData: true,
      refetchOnWindowFocus: false,
      retry: retryBoardOnce,
    },
  );

  const { refetch } = board;

  const keyRef = useRef(queryKey);

  keyRef.current = queryKey;

  // A burst of route events is one refetch, never two within ten seconds.
  const scheduleRefetch = useRefetchScheduler(() => void refetch());

  useEffect(() => {
    let disposed = false;
    let bound: ReturnType<typeof getSocket> = null;

    const handle = (event: unknown) => {
      if (disposed) return;

      if (isStopSettled(event)) {
        queryClient.setQueryData<RouteMonitoringData | undefined>(
          keyRef.current,
          (current) =>
            current
              ? { ...current, routes: applyStopSettled(current.routes, event) }
              : current,
        );

        return;
      }

      // "A caminho" (decision 6.4): one dot turns blue, the previous one grey.
      if (isStopOnTheWay(event)) {
        queryClient.setQueryData<RouteMonitoringData | undefined>(
          keyRef.current,
          (current) =>
            current
              ? { ...current, routes: applyStopOnTheWay(current.routes, event) }
              : current,
        );

        return;
      }

      // Started, completed, cancelled, released, a status moved by hand:
      // more than a dot changed.
      scheduleRefetch();
    };

    void (async () => {
      const socket = getSocket() ?? (await initializeSocket());

      if (disposed) return;

      bound = socket;
      socket.on("routeEvent", handle);
    })().catch(() => undefined);

    const stopResync = onRealtimeResync(scheduleRefetch);

    return () => {
      disposed = true;

      stopResync();
      bound?.off("routeEvent", handle);
    };
  }, [queryClient, scheduleRefetch]);

  const data = board.data;

  // A route cancelled while this was the last page leaves it empty: back to
  // the last page that has routes, not "Nenhuma rota hoje" with no pager.
  const settledPage = settledBoardPage(page, data?.meta);

  useEffect(() => {
    if (settledPage !== page) setPage(settledPage);
  }, [settledPage, page]);

  if (!data && board.isError) {
    const refusal = accessErrorOf(board.error);

    if (refusal) {
      return (
        <AccessErrorState
          kind={refusal.kind}
          moduleLabel="Entregas"
          audience={mode === "admin" ? "master" : "company"}
          message={refusal.message}
        />
      );
    }

    const copy = describeFailure(board.error, "as rotas");

    return (
      <EmptyState
        icon={AlertTriangle}
        size="inline"
        title={copy.title}
        description={copy.description}
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => void refetch()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        }
      />
    );
  }

  // No data yet, or a page past the end on its way back (the effect above).
  if (!data || (data.routes.length === 0 && data.meta.total > 0)) {
    return (
      <div className="space-y-2" aria-busy="true">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-28 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (data.routes.length === 0) {
    return (
      <EmptyState
        icon={RouteIcon}
        size="inline"
        title="Nenhuma rota hoje"
        description="As rotas do dia e as que ainda estão em andamento aparecem aqui, com cada entrega."
      />
    );
  }

  const pages = Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize));

  // Every hour on the board in the company's zone, like the tower: the day
  // it shows is the company's.
  const timeOf = (iso: string) =>
    formatEventMoment(iso, data.day, data.timeZone);

  const zoneNote = companyZoneNote(data.timeZone);

  return (
    <div className="space-y-3">
      {board.isError && (
        <p role="alert" className="text-xs text-amber-700 dark:text-amber-400">
          Não foi possível atualizar agora; mostrando a última leitura.
        </p>
      )}

      {zoneNote && <p className="text-xs text-muted-foreground">{zoneNote}</p>}

      <ul className="space-y-2">
        {data.routes.map((route) => {
          const completion = route.progress.completion ?? 0;
          const deliveredShare = route.progress.deliveredRate ?? 0;

          // At most one blue dot per route: the driver's latest mark.
          const onTheWayId = onTheWayStopOf(route.stops);

          return (
            <li
              key={route.id}
              className="rounded-lg border p-4"
              data-route-card={route.code}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">
                    Rota {route.code}
                    {route.name ? ` · ${route.name}` : ""}
                  </p>

                  <Badge variant="outline" className="text-[10px]">
                    {STATUS_LABELS[route.status]}
                  </Badge>

                  <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                    <UserRound className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {route.driver.name ?? "Motorista"}
                    </span>
                  </span>

                  {route.vehiclePlate && (
                    <Badge variant="secondary" className="text-[10px]">
                      {route.vehiclePlate}
                    </Badge>
                  )}
                </div>

                <span className="text-xs tabular-nums text-muted-foreground">
                  {route.progress.delivered + route.progress.failed} de{" "}
                  {route.progress.total - route.progress.cancelled} ·{" "}
                  <strong className="text-foreground">
                    {completion.toLocaleString("pt-BR")}%
                  </strong>
                </span>
              </div>

              {(route.destination ||
                route.startedAt ||
                route.plannedDepartureAt) && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {route.destination ? `Destino: ${route.destination}` : ""}
                  {route.destination &&
                  (route.startedAt || route.plannedDepartureAt)
                    ? " · "
                    : ""}
                  {route.startedAt
                    ? `Saiu às ${timeOf(route.startedAt)}`
                    : route.plannedDepartureAt
                      ? `Saída prevista às ${timeOf(route.plannedDepartureAt)}`
                      : ""}
                </p>
              )}

              {/* Green the delivered share, red the refused one: together,
              the completion. */}
              <div
                className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-muted"
                role="img"
                aria-label={`${completion}% concluída, ${deliveredShare}% entregue`}
              >
                <div
                  className="h-full bg-green-600"
                  style={{ width: `${deliveredShare}%` }}
                />
                <div
                  className="h-full bg-red-600"
                  style={{
                    width: `${Math.max(0, completion - deliveredShare)}%`,
                  }}
                />
              </div>

              <ol
                className="mt-3 flex flex-wrap gap-1.5"
                aria-label={`Entregas da rota ${route.code}`}
              >
                {route.stops.map((stop) => {
                  const dot = stopDot(stop, onTheWayId);
                  const label = `${stop.sequence}. ${stop.recipientName} — ${stop.city} · ${DOT_LABELS[dot]}${
                    stop.completedAt
                      ? ` às ${timeOf(stop.completedAt)}`
                      : dot === "on_the_way" && stop.onTheWayAt
                        ? ` desde ${timeOf(stop.onTheWayAt)}`
                        : ""
                  }`;

                  return (
                    <li key={stop.id}>
                      <Link
                        href={deliveryHref(stop.deliveryId, mode, businessId)}
                        title={label}
                        aria-label={label}
                        data-dot={dot}
                        className={`block h-3.5 w-3.5 rounded-full border-2 focus-visible:outline
                        focus-visible:outline-2 focus-visible:outline-offset-2 ${DOT_CLASSES[dot]}`}
                      />
                    </li>
                  );
                })}
              </ol>
            </li>
          );
        })}
      </ul>

      {pages > 1 && (
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            Página {data.meta.page} de {pages} · {data.meta.total} rotas
          </span>

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page <= 1 || board.isFetching}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Anterior
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page >= pages || board.isFetching}
              onClick={() => setPage((current) => current + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {(
          [
            "delivered",
            "failed",
            "pending",
            "arrived",
            "on_the_way",
          ] as StopDot[]
        ).map((dot) => (
          <span key={dot} className="flex items-center gap-1">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full border-2 ${DOT_CLASSES[dot]}`}
            />
            {DOT_LABELS[dot]}
          </span>
        ))}
      </p>
    </div>
  );
};

export { RouteBoard };
