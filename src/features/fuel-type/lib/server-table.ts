import {
  assertServerTableSpec,
  serverTableQuery,
  type ServerTableSpec,
} from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

/**
 * The fuel types list on the server-side table contract (decision 8.8). A
 * company has at most one row per fuel (eight kinds), so there is no facet:
 * the search covers it, and the order is the server's. Keys are the API's
 * (trajetto-api fuel-type-list.ts). No directive: the server content imports
 * it too.
 */
const FUEL_TYPE_TABLE: ServerTableSpec = assertServerTableSpec({
  sortable: ["created_at", "description", "updated_at"],
  defaultSort: { id: "created_at", desc: true },
  facets: {},
});

function fuelTypeListQuery(
  searchParams: Record<string, string | string[] | undefined>,
): Record<string, string> {
  return serverTableQuery(searchParams, FUEL_TYPE_TABLE);
}

export { FUEL_TYPE_TABLE, fuelTypeListQuery };
