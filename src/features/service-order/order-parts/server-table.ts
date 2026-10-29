import {
  assertServerTableSpec,
  serverTableQuery,
  type ServerTableSpec,
} from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

/**
 * The order-part listing's server-side table (decision 8.8), the API's keys
 * (trajetto-api list-service-order-part-schema). `serviceOrderId` narrows the
 * list to one order (the order's "Ver Peças da Ordem"); it has no filter
 * button of its own. No directive: the server content imports it too.
 */
const ORDER_PART_TABLE: ServerTableSpec = assertServerTableSpec({
  sortable: [
    "created_at",
    "updated_at",
    "partDescription",
    "unit_price",
    "quantity",
    "discount_percentage",
    "serviceOrderDate",
    "vehicleLicensePlate",
  ],
  defaultSort: { id: "created_at", desc: true },
  facets: {
    partDescription: { param: "partId", values: "uuid" },
    serviceOrderId: { param: "serviceOrderId", values: "uuid" },
  },
});

function orderPartListQuery(
  searchParams: Record<string, string | string[] | undefined>,
): Record<string, string> {
  return serverTableQuery(searchParams, ORDER_PART_TABLE);
}

export { ORDER_PART_TABLE, orderPartListQuery };
