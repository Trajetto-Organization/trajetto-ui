type RouteStatus =
  | "PLANNED"
  | "RELEASED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

type RouteStopStatus =
  | "PENDING"
  | "ARRIVED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

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

const ROUTE_STOP_STATUS_META: Record<RouteStopStatus, StatusMeta> = {
  PENDING: {
    label: "A caminho",
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
  ROUTE_STATUS_META,
  ROUTE_STOP_STATUS_META,
  ROUTE_TRANSITIONS,
  canCancelRoute,
  canReleaseRoute,
  canUnreleaseRoute,
  isRouteEditable,
  isStopOpen,
  routeProgress,
};
export type { RouteStatus, RouteStopStatus };
