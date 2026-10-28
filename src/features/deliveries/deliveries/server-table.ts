import {
  assertServerTableSpec,
  serverTableQuery,
  type FacetCount,
  type ServerTableSpec,
} from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import { DELIVERY_STATUS_META } from "../lib/status";
import { DELIVERY_KINDS, DELIVERY_KIND_LABELS } from "../lib/kind";
import {
  deliveryPeriodQuery,
  type DeliveryListPeriodMeta,
} from "../lib/period";

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
    // Entrega, Ordem de serviço or Coleta (meeting of 14/10/2026). The API
    // filters by it without a count per option.
    kind: { param: "kind", values: DELIVERY_KINDS },
  },
});

const DELIVERY_STATUS_FILTER_LABELS: Record<string, string> =
  Object.fromEntries(
    Object.entries(DELIVERY_STATUS_META).map(([status, meta]) => [
      status,
      meta.label,
    ]),
  );

/** The Tipo filter's options: the labels only (no counts from the API). */
const DELIVERY_KIND_FILTER_LABELS: Record<string, string> = {
  ...DELIVERY_KIND_LABELS,
};

/** The listing's `meta.searchMeta`, as the API streams it. */
interface DeliveryListSearchMeta {
  statusCounts?: Record<string, number>;
  facets?: {
    status?: FacetCount[];
    shipperId?: FacetCount[];
    driverId?: FacetCount[];
  };
  /**
   * The days the page and the counts cover, in the company's zone; null for
   * every date. Absent from an API older than the period.
   */
  period?: DeliveryListPeriodMeta | null;
}

/** The page's searchParams (server) or the URL's (client). */
type ParamSource = Parameters<typeof serverTableQuery>[0];

/**
 * The sort, filter and period params to add to `/delivery/list-delivery`
 * and to the export, read from the page's searchParams. Next to page,
 * pageSize, search and businessId, which the page already sends. The period
 * always travels: the list opens on today (lib/period), while an API with no
 * period answers every date.
 */
function deliveriesListQuery(
  searchParams: ParamSource,
): Record<string, string> {
  return {
    ...serverTableQuery(searchParams, DELIVERY_TABLE),
    ...deliveryPeriodQuery(searchParams),
  };
}

export {
  DELIVERY_KIND_FILTER_LABELS,
  DELIVERY_STATUS_FILTER_LABELS,
  DELIVERY_TABLE,
  deliveriesListQuery,
  type DeliveryListSearchMeta,
};
