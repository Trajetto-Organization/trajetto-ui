/**
 * The react-query roots the route page shares between its pieces, kept out
 * of the Leaflet module (route-map.tsx) so the hook that invalidates them
 * does not pull the map library into its chunk.
 */

/** The trail of a route drawn on its map (§4.12). */
const ROUTE_TRAIL_QUERY_KEY = "route-trail";

/** Every trail of one route: the prefix a route event invalidates. */
const routeTrailRoot = (routeId: string) =>
  [ROUTE_TRAIL_QUERY_KEY, routeId] as const;

const routeTrailKey = (routeId: string, driverId: string) =>
  [ROUTE_TRAIL_QUERY_KEY, routeId, driverId] as const;

export { ROUTE_TRAIL_QUERY_KEY, routeTrailKey, routeTrailRoot };
