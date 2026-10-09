/**
 * The monitoring board's arithmetic, apart from any render (decision 6.6).
 */

import type {
  MonitoredRoute,
  MonitoredRouteProgress,
  MonitoredStop,
} from "@/actions/control-tower/types";

import { currentOnTheWayStopId } from "@/features/routes/lib/status";

/** A driver's day as both boards count it (decision 7.1). */
interface DriverDayCounts {
  designated: number;
  inRoute: number;
  deliveredToday: number;
  failedToday: number;
}

interface DriverProgress {
  /** Delivered + failed: stops with an outcome. */
  resolved: number;
  total: number;

  /** resolved / total, in whole %. */
  completion: number;

  /** delivered / total, in whole %. */
  deliveredRate: number;
}

/**
 * How far a driver's day got (DLV-MON-3, DLVP-MON-2).
 *
 * It was delivered / (designated + in route + delivered): the failures left
 * both sides, so 3 delivered and 7 refused read 100%. A refused address is
 * resolved — the driver is done with it — so it counts in the completion,
 * and the success share is shown beside it.
 */
function driverProgress(row: DriverDayCounts): DriverProgress {
  const resolved = row.deliveredToday + row.failedToday;
  const total = row.designated + row.inRoute + resolved;

  const percent = (value: number) =>
    total > 0 ? Math.round((value / total) * 100) : 0;

  return {
    resolved,
    total,
    completion: percent(resolved),
    deliveredRate: percent(row.deliveredToday),
  };
}

type StopDot =
  "delivered" | "failed" | "pending" | "arrived" | "on_the_way" | "cancelled";

type StopState = Pick<MonitoredStop, "id" | "status" | "onTheWayAt">;

/**
 * The route's stop that is "a caminho" now (decision 6.4): the latest mark,
 * while its stop is pending. Every stop that was ever marked keeps its
 * `onTheWayAt`; only this one is blue.
 */
function onTheWayStopOf(stops: ReadonlyArray<StopState>): string | null {
  return currentOnTheWayStopId(
    stops.map((stop) => ({
      id: stop.id,
      status: stop.status,
      on_the_way_at: stop.onTheWayAt,
    })),
  );
}

/** Green delivered, red not delivered, grey pending — with the two pending shades. */
function stopDot(
  stop: Pick<MonitoredStop, "id" | "status">,
  currentOnTheWayId: string | null,
): StopDot {
  if (stop.status === "COMPLETED") return "delivered";
  if (stop.status === "FAILED") return "failed";
  if (stop.status === "CANCELLED") return "cancelled";
  if (stop.status === "ARRIVED") return "arrived";

  return stop.id === currentOnTheWayId ? "on_the_way" : "pending";
}

const DOT_LABELS: Record<StopDot, string> = {
  delivered: "Entregue",
  failed: "Não entregue",
  pending: "Pendente",
  arrived: "No local",
  on_the_way: "A caminho",
  cancelled: "Retirada da rota",
};

/**
 * The same rule as the API's routeProgress, for a stop patched live — with
 * `onTheWay` counting only the current mark (at most one per route).
 */
function progressOf(stops: ReadonlyArray<StopState>): MonitoredRouteProgress {
  const progress: MonitoredRouteProgress = {
    total: stops.length,
    delivered: 0,
    failed: 0,
    pending: 0,
    cancelled: 0,
    arrived: 0,
    onTheWay: 0,
    completion: null,
    deliveredRate: null,
  };

  const current = onTheWayStopOf(stops);

  for (const stop of stops) {
    const dot = stopDot(stop, current);

    if (dot === "delivered") progress.delivered += 1;
    else if (dot === "failed") progress.failed += 1;
    else if (dot === "cancelled") progress.cancelled += 1;
    else {
      progress.pending += 1;

      if (dot === "arrived") progress.arrived += 1;
      if (dot === "on_the_way") progress.onTheWay += 1;
    }
  }

  const base = progress.total - progress.cancelled;

  if (base > 0) {
    const percent = (value: number) => Math.round((value / base) * 1000) / 10;

    progress.completion = percent(progress.delivered + progress.failed);
    progress.deliveredRate = percent(progress.delivered);
  }

  return progress;
}

interface StopSettledEvent {
  type: "route-stop.settled";
  routeId: string;
  stopId: string;
  stopStatus: string;

  /**
   * When the stop settled, once the API sends it (route-realtime.ts): the
   * patched dot keeps its "às HH:mm" instead of losing it until the next
   * refetch. Absent, the stored moment stays.
   */
  completedAt?: string | null;
}

function isStopSettled(event: unknown): event is StopSettledEvent {
  if (!event || typeof event !== "object") return false;

  const value = event as Record<string, unknown>;

  return (
    value.type === "route-stop.settled" &&
    typeof value.routeId === "string" &&
    typeof value.stopId === "string" &&
    typeof value.stopStatus === "string"
  );
}

/**
 * The board after a stop settled, without a round trip: the socket says which
 * stop and how it ended, which is all a dot and a percentage need. The SAME
 * array when the stop is not on this page, so React skips the render.
 */
function applyStopSettled(
  routes: MonitoredRoute[],
  event: StopSettledEvent,
): MonitoredRoute[] {
  const index = routes.findIndex((route) => route.id === event.routeId);

  if (index < 0) return routes;

  const route = routes[index];

  if (!route.stops.some((stop) => stop.id === event.stopId)) return routes;

  const completedAt =
    typeof event.completedAt === "string" ? event.completedAt : undefined;

  const stops = route.stops.map((stop) =>
    stop.id === event.stopId
      ? {
          ...stop,
          status: event.stopStatus as MonitoredStop["status"],
          ...(completedAt !== undefined && { completedAt }),
        }
      : stop,
  );

  const next = [...routes];

  next[index] = { ...route, stops, progress: progressOf(stops) };

  return next;
}

interface StopOnTheWayEvent {
  type: "route-stop.on_the_way";
  routeId: string;
  stopId: string;

  /** The mark's instant (ISO). */
  onTheWayAt: string;
}

function isStopOnTheWay(event: unknown): event is StopOnTheWayEvent {
  if (!event || typeof event !== "object") return false;

  const value = event as Record<string, unknown>;

  return (
    value.type === "route-stop.on_the_way" &&
    typeof value.routeId === "string" &&
    typeof value.stopId === "string" &&
    typeof value.onTheWayAt === "string" &&
    !Number.isNaN(new Date(value.onTheWayAt).getTime())
  );
}

/**
 * The board after the driver said "a caminho", without a round trip: the
 * stop keeps the later of its stored instant and the event's (the API's
 * rule — an out-of-order older mark never moves it back), and the dots are
 * recomputed, so the previous blue one turns grey. The SAME array when the
 * stop is not on this page.
 */
function applyStopOnTheWay(
  routes: MonitoredRoute[],
  event: StopOnTheWayEvent,
): MonitoredRoute[] {
  const index = routes.findIndex((route) => route.id === event.routeId);

  if (index < 0) return routes;

  const route = routes[index];

  if (!route.stops.some((stop) => stop.id === event.stopId)) return routes;

  const incoming = new Date(event.onTheWayAt).getTime();

  const stops = route.stops.map((stop) => {
    if (stop.id !== event.stopId) return stop;

    const stored = stop.onTheWayAt ? new Date(stop.onTheWayAt).getTime() : null;

    return stored !== null && stored >= incoming
      ? stop
      : { ...stop, onTheWayAt: event.onTheWayAt };
  });

  const next = [...routes];

  next[index] = { ...route, stops, progress: progressOf(stops) };

  return next;
}

export {
  DOT_LABELS,
  applyStopOnTheWay,
  applyStopSettled,
  driverProgress,
  isStopOnTheWay,
  isStopSettled,
  onTheWayStopOf,
  progressOf,
  stopDot,
};
export type {
  DriverDayCounts,
  DriverProgress,
  StopDot,
  StopOnTheWayEvent,
  StopSettledEvent,
};
