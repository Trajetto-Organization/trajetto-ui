/**
 * The driver's dot on a route's own page, by the Torre's rules
 * (control-tower/lib/live-positions).
 *
 * The page forced every socket point to `fresh: true`, nothing aged it
 * between two reads, and it stayed after the route ended: a phone that
 * stopped reporting an hour ago still drew a moving truck, and a finished
 * route kept a live dot on its map. Freshness is recomputed from when the
 * DEVICE recorded the point, on a clock, and a route that is not on the road
 * any more shows no live point of its own.
 */

import type { RouteDriverPosition } from "@/actions/route/get-route";
import type { RouteStatus } from "@/features/routes/lib/status";

import {
  isNewerPosition,
  isRecentlyRecorded,
} from "@/features/control-tower/lib/live-positions";

/** How often the dot ages between two reads: the Torre's clock. */
const ROUTE_POSITION_CLOCK_MS = 30_000;

/** The statuses in which the route's driver reports for this route. */
const ON_THE_ROAD: ReadonlySet<string> = new Set<RouteStatus>([
  "RELEASED",
  "IN_PROGRESS",
]);

function isRouteOnTheRoad(status: string): boolean {
  return ON_THE_ROAD.has(status);
}

/**
 * The dot to draw now: the socket's point when the route is on the road and
 * the point is newer than the read's, else the read's; fresh only while
 * recorded within the Torre's window. A route that left the road keeps the
 * read's last point, never fresh.
 */
function routeDriverPosition({
  fetched,
  live,
  routeStatus,
  now,
}: {
  fetched: RouteDriverPosition | null;
  live: RouteDriverPosition | null;
  routeStatus: string;
  now: number;
}): RouteDriverPosition | null {
  const onTheRoad = isRouteOnTheRoad(routeStatus);

  const newest =
    onTheRoad &&
    live &&
    (!fetched || isNewerPosition(live.recordedAt, fetched.recordedAt))
      ? live
      : fetched;

  if (!newest) return null;

  if (!onTheRoad) return { ...newest, fresh: false };

  return { ...newest, fresh: isRecentlyRecorded(newest.recordedAt, now) };
}

export { ROUTE_POSITION_CLOCK_MS, isRouteOnTheRoad, routeDriverPosition };
