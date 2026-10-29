import {
  assertServerTableSpec,
  serverTableQuery,
  type ServerTableSpec,
} from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

/**
 * The parts catalog's server-side table (decision 8.8): sort keys and the
 * supplier facet are the API's (trajetto-api list-part-schema). No directive:
 * the server content imports it too.
 */
const PART_TABLE: ServerTableSpec = assertServerTableSpec({
  sortable: [
    "created_at",
    "updated_at",
    "description",
    "unit_price",
    "supplierName",
  ],
  defaultSort: { id: "created_at", desc: true },
  facets: {
    supplierName: { param: "supplierId", values: "uuid" },
  },
});

function partListQuery(
  searchParams: Record<string, string | string[] | undefined>,
): Record<string, string> {
  return serverTableQuery(searchParams, PART_TABLE);
}

export { PART_TABLE, partListQuery };
