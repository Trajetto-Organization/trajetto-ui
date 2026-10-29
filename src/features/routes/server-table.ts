import {
  assertServerTableSpec,
  serverTableQuery,
  type FacetCount,
  type ServerTableSpec,
} from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import { ROUTE_STATUS_META, type RouteStatus } from "./lib/status";

/**
 * The routes board on the server (decision 8.8). Sort keys and facet params
 * are the API's (trajetto-api route-list.ts); the column ids match them, so
 * the URL `sort` value is the column id. The table used to sort and filter
 * status, driver and vehicle among the ten rows it had loaded.
 *
 * No directive: the server component that asks the API imports this too.
 */
const ROUTE_TABLE: ServerTableSpec = assertServerTableSpec({
  sortable: [
    "created_at",
    "updated_at",
    "code",
    "status",
    "driverName",
    "vehiclePlate",
    "scheduled_date",
    "destination",
    "started_at",
    "completed_at",
  ],
  defaultSort: { id: "created_at", desc: true },
  facets: {
    status: { param: "status", values: Object.keys(ROUTE_STATUS_META) },
    // The NAME columns filter by id: the options (and their names) come from
    // the server, scoped to the company.
    driverName: { param: "driverId", values: "uuid" },
    vehiclePlate: { param: "vehicleId", values: "uuid" },
  },
});

const ROUTE_STATUS_FILTER_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(ROUTE_STATUS_META).map(([status, meta]) => [
    status,
    meta.label,
  ]),
);

/** The listing's `meta.searchMeta`, as the API streams it. */
interface RouteListSearchMeta {
  statusCounts?: Partial<Record<RouteStatus, number>>;
  facets?: {
    status?: FacetCount[];
    driverId?: FacetCount[];
    vehicleId?: FacetCount[];
  };
}

/** The page's searchParams (server) or the URL's (client). */
type ParamSource = Parameters<typeof serverTableQuery>[0];

/**
 * The sort and filter params to add to `/route/list-routes`, read from the
 * page's searchParams, next to page, pageSize, search and businessId.
 */
function routesListQuery(searchParams: ParamSource): Record<string, string> {
  return serverTableQuery(searchParams, ROUTE_TABLE);
}

export {
  ROUTE_STATUS_FILTER_LABELS,
  ROUTE_TABLE,
  routesListQuery,
  type RouteListSearchMeta,
};
