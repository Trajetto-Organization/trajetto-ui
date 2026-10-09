type RouteStatus =
  "PLANNED" | "RELEASED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

type RouteStopStatus =
  "PENDING" | "ARRIVED" | "COMPLETED" | "FAILED" | "CANCELLED";

interface StatusMeta {
  label: string;
  badgeClassName: string;
}

/**
 * The five states of a route, in Portuguese, with the colours the badge uses.
 *
 * Mirrors the API's state machine. The API remains the enforcement point —
 * this exists so the screen offers only legal moves instead of letting the
 * dispatcher discover them by being refused.
 */
const ROUTE_STATUS_META: Record<RouteStatus, StatusMeta> = {
  PLANNED: {
    label: "Planejada",
    badgeClassName: "bg-slate-100 text-slate-800 border-slate-200",
  },
  RELEASED: {
    label: "Liberada",
    badgeClassName: "bg-amber-100 text-amber-800 border-amber-200",
  },
  IN_PROGRESS: {
    label: "Em andamento",
    badgeClassName: "bg-blue-100 text-blue-800 border-blue-200",
  },
  COMPLETED: {
    label: "Concluída",
    badgeClassName: "bg-green-100 text-green-800 border-green-200",
  },
  CANCELLED: {
    label: "Cancelada",
    badgeClassName: "bg-gray-100 text-gray-500 border-gray-200",
  },
};

/**
 * A stop's own status. PENDING is "Pendente": it used to read "A caminho",
 * which claimed of every untouched address what only the driver can say —
 * that is ON_THE_WAY_STOP_META, for the one stop the driver marked.
 */
const ROUTE_STOP_STATUS_META: Record<RouteStopStatus, StatusMeta> = {
  PENDING: {
    label: "Pendente",
    badgeClassName: "bg-slate-100 text-slate-800 border-slate-200",
  },
  ARRIVED: {
    label: "No local",
    badgeClassName: "bg-blue-100 text-blue-800 border-blue-200",
  },
  COMPLETED: {
    label: "Entregue",
    badgeClassName: "bg-green-100 text-green-800 border-green-200",
  },
  FAILED: {
    label: "Insucesso",
    badgeClassName: "bg-red-100 text-red-800 border-red-200",
  },
  CANCELLED: {
    label: "Cancelada",
    badgeClassName: "bg-gray-100 text-gray-500 border-gray-200",
  },
};

/** A pending stop the driver said they are heading to (decision 6.4). */
const ON_THE_WAY_STOP_META: StatusMeta = {
  label: "A caminho",
  badgeClassName: "bg-sky-100 text-sky-800 border-sky-200",
};

interface StopOnTheWayState {
  id: string;
  status: string;
  on_the_way_at?: string | null;
}

/**
 * The stop that is "a caminho" right now, or null — the API's rule
 * (mark-stop-on-the-way/on-the-way-rules.ts), mirrored.
 *
 * The stop holding the route's latest `on_the_way_at`, only while it is
 * still PENDING: a driver goes to one address at a time, so marking B after
 * A makes B current, and once the latest-marked stop is reached nothing is.
 * Ties go to the greater id, so every screen picks the same stop.
 */
function currentOnTheWayStopId(
  stops: ReadonlyArray<StopOnTheWayState>,
): string | null {
  let latest: { id: string; status: string; at: number } | null = null;

  for (const stop of stops) {
    if (!stop.on_the_way_at) continue;

    const at = new Date(stop.on_the_way_at).getTime();

    if (Number.isNaN(at)) continue;

    if (
      !latest ||
      at > latest.at ||
      (at === latest.at && stop.id > latest.id)
    ) {
      latest = { id: stop.id, status: stop.status, at };
    }
  }

  return latest && latest.status === "PENDING" ? latest.id : null;
}

/** The badge a stop shows: its status, or "A caminho" for the current one. */
function routeStopMeta(
  stop: { id: string; status: RouteStopStatus },
  currentOnTheWayId: string | null,
): StatusMeta {
  if (stop.status === "PENDING" && stop.id === currentOnTheWayId) {
    return ON_THE_WAY_STOP_META;
  }

  return ROUTE_STOP_STATUS_META[stop.status];
}

/**
 * A route may only be edited — renamed, re-dated, re-crewed, and have its
 * stops added, removed or reordered — while it has not been executed.
 *
 * After the departure the route is a record of what the driver is doing, and
 * the order is what they are following on the screen in their hand.
 */
const EDITABLE_ROUTE_STATUSES: RouteStatus[] = ["PLANNED", "RELEASED"];

function isRouteEditable(status: RouteStatus): boolean {
  return EDITABLE_ROUTE_STATUSES.includes(status);
}

/** Mirror of the API's ROUTE_TRANSITIONS. */
const ROUTE_TRANSITIONS: Record<RouteStatus, RouteStatus[]> = {
  PLANNED: ["RELEASED", "CANCELLED"],
  RELEASED: ["PLANNED", "IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

function canCancelRoute(status: RouteStatus): boolean {
  return ROUTE_TRANSITIONS[status].includes("CANCELLED");
}

function canReleaseRoute(status: RouteStatus): boolean {
  return ROUTE_TRANSITIONS[status].includes("RELEASED");
}

/**
 * Pulling a released route back to planning is only legal while nothing has
 * been worked — which, before the departure, is always true. The API checks
 * the stops as well; this is the cheap half.
 */
function canUnreleaseRoute(status: RouteStatus): boolean {
  return status === "RELEASED";
}

/** A stop still holding its delivery. */
function isStopOpen(status: RouteStopStatus): boolean {
  return status === "PENDING" || status === "ARRIVED";
}

/**
 * Worked over total.
 *
 * The API sends this on the detail endpoint, but the table has only the stops
 * and needs the same number — so it is computed here from the same rule
 * rather than from a second, hand-written one.
 */
function routeProgress(stopStatuses: RouteStopStatus[]): {
  done: number;
  total: number;
} {
  const counted = stopStatuses.filter((status) => status !== "CANCELLED");

  return {
    done: counted.filter((status) => !isStopOpen(status)).length,
    total: counted.length,
  };
}

/**
 * Moves one stop one position, and answers null when it cannot.
 *
 * Extracted from the dialog because an off-by-one here does not throw, does
 * not fail a typecheck and does not look wrong on screen — it silently gives
 * a driver a different street order than the dispatcher chose, which is only
 * discovered on the road.
 */
function moveStop<T>(list: T[], index: number, direction: -1 | 1): T[] | null {
  const target = index + direction;

  if (index < 0 || index >= list.length) return null;
  if (target < 0 || target >= list.length) return null;

  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];

  return next;
}

export {
  EDITABLE_ROUTE_STATUSES,
  moveStop,
  ON_THE_WAY_STOP_META,
  ROUTE_STATUS_META,
  ROUTE_STOP_STATUS_META,
  ROUTE_TRANSITIONS,
  canCancelRoute,
  canReleaseRoute,
  canUnreleaseRoute,
  currentOnTheWayStopId,
  isRouteEditable,
  isStopOpen,
  routeProgress,
  routeStopMeta,
};
export type { RouteStatus, RouteStopStatus };
