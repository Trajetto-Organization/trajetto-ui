import type { VehicleListSearchMeta } from "../types";

/**
 * The four cards' numbers, read from the API's tally (`searchMeta`), never
 * from the rows on screen (decision 8.8): the page used to count ten rows
 * as if they were the fleet.
 *
 * The tally is counted without the status filter, so filtering "Bloqueado"
 * narrows the table without zeroing the other cards. Absent (an older API
 * during a rolling deploy, or a failed request) the derived cards stay
 * `undefined` and read "—" rather than a confident 0.
 */
interface VehicleStatsData {
  totalVehicles: number | undefined;
  activeVehicles: number | undefined;
  inRoute: number | undefined;
  outOfOperation: number | undefined;
}

function vehicleStatsData(
  searchMeta: VehicleListSearchMeta | undefined,
  pagerTotal: number,
): VehicleStatsData {
  const counts = searchMeta?.statusCounts;

  return {
    totalVehicles: searchMeta?.total ?? (counts ? undefined : pagerTotal),
    activeVehicles: counts?.ACTIVE,
    inRoute: counts?.IN_ROUTE,
    outOfOperation: counts ? counts.INACTIVE + counts.BLOCKED : undefined,
  };
}

/** "6 (50%)" of the cards' base; "—" when the tally did not come. */
function asShare(value: number | undefined, total: number | undefined): string {
  if (value === undefined) return "—";
  if (!total || total <= 0) return "0";

  return `${value} (${Math.round((value / total) * 100)}%)`;
}

/**
 * "Em Rota" counts IN_ROUTE, which only a Route (Gestão de Entregas) writes:
 * a fleet-only company would read a card that is always 0 and names routes.
 * The MASTER and unknown modules keep it (the sidebar's rule).
 */
function showsInRouteStat(context: {
  role: string | null | undefined;
  enabledModules: readonly string[] | null | undefined;
}): boolean {
  if (context.role === "MASTER") return true;

  return (
    !context.enabledModules || context.enabledModules.includes("DELIVERIES")
  );
}

export { asShare, showsInRouteStat, vehicleStatsData };
export type { VehicleStatsData };
