import {
  assertServerTableSpec,
  serverTableQuery,
  type ServerTableSpec,
} from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

/**
 * The vehicle-type table's server contract (decision 8.8): the sort keys of
 * trajetto-api usecases/list-vehicle-type/vehicle-type-list.ts. No facets.
 */
const VEHICLE_TYPE_TABLE: ServerTableSpec = assertServerTableSpec({
  sortable: [
    "created_at",
    "description",
    "number_of_axles",
    "required_cnh_category",
    "vehicleCount",
  ],
  defaultSort: { id: "created_at", desc: true },
  facets: {},
});

function vehicleTypeListQuery(
  searchParams: Record<string, string | string[] | undefined>,
): Record<string, string> {
  return serverTableQuery(searchParams, VEHICLE_TYPE_TABLE);
}

export { VEHICLE_TYPE_TABLE, vehicleTypeListQuery };
