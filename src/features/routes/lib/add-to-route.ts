/**
 * "Adicionar à rota" from the deliveries table (decision 14.7, §5.6), pure.
 *
 * Given the selection and where each delivery is now (open stops), decides
 * what the confirm will do: which ones simply join, which ones move from
 * another route that has not left, which ones are already on the chosen
 * route (a no-op), and which ones are on a route that left (blocked — the
 * button explains instead of the API refusing).
 */

interface OpenStopInfo {
  deliveryId: string;
  routeId: string;
  routeCode: number;
  routeStatus: string;
}

interface SelectionPlan {
  free: string[];
  moving: Array<{ deliveryId: string; routeCode: number }>;
  alreadyHere: string[];
  blocked: Array<{ deliveryId: string; routeCode: number }>;

  /** move-stops when anything moves, add-stops otherwise. */
  operation: "add" | "move";
}

const EDITABLE = new Set(["PLANNED", "RELEASED"]);

function planSelection(
  deliveryIds: readonly string[],
  openStops: readonly OpenStopInfo[],
  targetRouteId: string | null,
): SelectionPlan {
  const byDelivery = new Map(openStops.map((stop) => [stop.deliveryId, stop]));

  const plan: SelectionPlan = {
    free: [],
    moving: [],
    alreadyHere: [],
    blocked: [],
    operation: "add",
  };

  for (const deliveryId of new Set(deliveryIds)) {
    const stop = byDelivery.get(deliveryId);

    if (!stop) {
      plan.free.push(deliveryId);
      continue;
    }

    if (!EDITABLE.has(stop.routeStatus)) {
      plan.blocked.push({ deliveryId, routeCode: stop.routeCode });
      continue;
    }

    if (targetRouteId && stop.routeId === targetRouteId) {
      plan.alreadyHere.push(deliveryId);
      continue;
    }

    plan.moving.push({ deliveryId, routeCode: stop.routeCode });
  }

  plan.operation = plan.moving.length > 0 ? "move" : "add";

  return plan;
}

/** "3 já estão na Rota 9 e serão movidas", grouped by route. */
function movingSummary(moving: SelectionPlan["moving"]): string | null {
  if (moving.length === 0) return null;

  const byRoute = new Map<number, number>();

  for (const entry of moving) {
    byRoute.set(entry.routeCode, (byRoute.get(entry.routeCode) ?? 0) + 1);
  }

  const parts = [...byRoute.entries()]
    .sort(([a], [b]) => a - b)
    .map(([code, count]) =>
      count === 1
        ? `1 já está na Rota ${code}`
        : `${count} já estão na Rota ${code}`,
    );

  return `${parts.join(", ")} e ${moving.length === 1 ? "será movida" : "serão movidas"}.`;
}

/** The pill's own reason to stay disabled, or null. */
function addToRouteBlocker(
  selection: ReadonlyArray<{ status: string }>,
): string | null {
  if (selection.some((delivery) => delivery.status !== "PENDING")) {
    return "Só entregas pendentes entram em rota. Desmarque as que já saíram de Pendente.";
  }

  return null;
}

/** "12 entregas adicionadas à Rota 12". */
function addedToRouteMessage(count: number, routeCode: number): string {
  return count === 1
    ? `1 entrega adicionada à Rota ${routeCode}.`
    : `${count} entregas adicionadas à Rota ${routeCode}.`;
}

export { addToRouteBlocker, addedToRouteMessage, movingSummary, planSelection };
export type { OpenStopInfo, SelectionPlan };
