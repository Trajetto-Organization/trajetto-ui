import {
  assertServerTableSpec,
  serverTableQuery,
  type FacetCount,
  type ServerTableSpec,
} from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import { DELIVERY_STATUS_META } from "../lib/status";

/**
 * The deliveries table on the server (decision 8.8). Sort keys and facet
 * params are the API's (trajetto-api list-delivery-schema); the column ids
 * match them, so the URL `sort` value is the column id. No directive: the
 * server component that asks the API imports this too, and so do the page
 * actions, because the export sends the same params (decision 5.8).
 */
const DELIVERY_TABLE: ServerTableSpec = assertServerTableSpec({
  sortable: [
    "created_at",
    "updated_at",
    "recipient_name",
    "status",
    "scheduled_date",
    "delivered_at",
    "shipperName",
    "driverName",
    "destination",
  ],
  defaultSort: { id: "created_at", desc: true },
  facets: {
    status: { param: "status", values: Object.keys(DELIVERY_STATUS_META) },
    // The NAME columns filter by id: the options (and their names) come from
    // the server, scoped to the company.
    shipperName: { param: "shipperId", values: "uuid" },
    driverName: { param: "driverId", values: "uuid" },
  },
});

const DELIVERY_STATUS_FILTER_LABELS: Record<string, string> =
  Object.fromEntries(
    Object.entries(DELIVERY_STATUS_META).map(([status, meta]) => [
      status,
      meta.label,
    ]),
  );

/** The listing's `meta.searchMeta`, as the API streams it. */
interface DeliveryListSearchMeta {
  statusCounts?: Record<string, number>;
  facets?: {
    status?: FacetCount[];
    shipperId?: FacetCount[];
    driverId?: FacetCount[];
  };
}

/** The page's searchParams (server) or the URL's (client). */
type ParamSource = Parameters<typeof serverTableQuery>[0];

/**
 * The sort and filter params to add to `/delivery/list-delivery` and to the
 * export, read from the page's searchParams. Next to page, pageSize, search
 * and businessId, which the page already sends.
 */
function deliveriesListQuery(
  searchParams: ParamSource,
): Record<string, string> {
  return serverTableQuery(searchParams, DELIVERY_TABLE);
}

export {
  DELIVERY_STATUS_FILTER_LABELS,
  DELIVERY_TABLE,
  deliveriesListQuery,
  type DeliveryListSearchMeta,
};
