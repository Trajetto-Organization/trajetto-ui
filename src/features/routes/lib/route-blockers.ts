import {
  canCancelRoute,
  canReleaseRoute,
  isRouteEditable,
  isStopOpen,
  type RouteStatus,
  type RouteStopStatus,
} from "./status";

/**
 * Why each act on a route is blocked, in the order the dispatcher would hit
 * it — one source for the board's row menu and the route page (decision
 * 14.7, §5.2), so the two never disagree about what a route allows.
 *
 * Null = allowed. The sentence is what the disabled control shows.
 */
interface BlockerInput {
  status: RouteStatus;
  vehicleId: string | null;
  stops: ReadonlyArray<{ status: RouteStopStatus }>;
}

interface Permission {
  canWrite: boolean;
  /** The permission tooltip, shown when `canWrite` is false. */
  message: string;
}

/** Stops still holding a delivery (what "at least one stop" means). */
const openStopCount = (route: BlockerInput): number =>
  route.stops.filter((stop) => isStopOpen(stop.status)).length;

function releaseBlocker(
  route: BlockerInput,
  permission: Permission,
): string | null {
  if (!permission.canWrite) return permission.message;

  if (!canReleaseRoute(route.status)) {
    return "Só uma rota em planejamento pode ser liberada.";
  }

  if (openStopCount(route) === 0) {
    return "Adicione ao menos uma parada antes de liberar a rota.";
  }

  if (!route.vehicleId) return "Defina o veículo da rota antes de liberá-la.";

  return null;
}

function cancelBlocker(
  route: BlockerInput,
  permission: Permission,
): string | null {
  if (!permission.canWrite) return permission.message;

  if (!canCancelRoute(route.status)) return "Esta rota já terminou.";

  return null;
}

function editBlocker(
  route: BlockerInput,
  permission: Permission,
): string | null {
  if (!permission.canWrite) return permission.message;

  if (!isRouteEditable(route.status)) {
    return "Uma rota que já saiu não pode mais ser editada. Cancele-a se precisar refazê-la.";
  }

  return null;
}

/** Adding, removing and ordering stops. */
function stopsBlocker(
  route: BlockerInput,
  permission: Permission,
): string | null {
  if (!permission.canWrite) return permission.message;

  if (!isRouteEditable(route.status)) {
    return "A ordem das paradas é o que o motorista está seguindo na tela dele — depois da saída ela não muda mais.";
  }

  return null;
}

/** The ceiling the API counts under its lock (D11). */
const ROUTE_MAX_STOPS = 200;

function addStopsBlocker(
  route: BlockerInput,
  permission: Permission,
): string | null {
  const blocked = stopsBlocker(route, permission);

  if (blocked) return blocked;

  if (openStopCount(route) >= ROUTE_MAX_STOPS) {
    return `Uma rota tem no máximo ${ROUTE_MAX_STOPS} paradas abertas.`;
  }

  return null;
}

export {
  ROUTE_MAX_STOPS,
  addStopsBlocker,
  cancelBlocker,
  editBlocker,
  openStopCount,
  releaseBlocker,
  stopsBlocker,
};
export type { BlockerInput, Permission };
