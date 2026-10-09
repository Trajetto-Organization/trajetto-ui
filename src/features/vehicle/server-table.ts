import {
  assertServerTableSpec,
  serverTableQuery,
  type ServerTableSpec,
} from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import { VEHICLE_STATUS_LABELS } from "@/lib/vehicle-status";

/**
 * The vehicle table's server-side contract (decision 8.8). Sort keys and
 * facet params are the API's (trajetto-api list-vehicle-schema and
 * usecases/list-vehicle/vehicle-list.ts); the column ids match them, so the
 * URL `sort` value is the column id. No directive: the server content that
 * asks the API imports this too.
 */
const VEHICLE_TABLE: ServerTableSpec = assertServerTableSpec({
  sortable: [
    "created_at",
    "description",
    "license_plate",
    "brand",
    "model",
    "status",
    "current_mileage",
    "acquisition_date",
    "model_year",
    "last_maintenance_date",
    "vehicleTypeDescription",
    "driverName",
    "branchName",
  ],
  defaultSort: { id: "created_at", desc: true },
  facets: {
    status: { param: "status", values: Object.keys(VEHICLE_STATUS_LABELS) },
    branchName: { param: "branchId", values: "uuid" },
  },
});

type PageSearchParams = Record<string, string | string[] | undefined>;

/** The sort and filter params to add to `/vehicle/list-vehicle` (and the export). */
function vehicleListQuery(
  searchParams: PageSearchParams,
): Record<string, string> {
  return serverTableQuery(searchParams, VEHICLE_TABLE);
}

export { VEHICLE_TABLE, vehicleListQuery };
