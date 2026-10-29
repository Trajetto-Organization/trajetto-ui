import {
  assertServerTableSpec,
  serverTableQuery,
  type FacetCount,
  type ServerTableSpec,
} from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

/**
 * The refuelings list on the server-side table contract (decision 8.8).
 *
 * Sort keys and facet params are the API's (trajetto-api
 * list-fuel-schema / fuel-list.ts); the column ids match them, so the URL
 * `sort` value is the column id. No directive: the server component that
 * asks the API imports this too.
 */
const FUEL_TABLE: ServerTableSpec = assertServerTableSpec({
  sortable: [
    "created_at",
    "refueling_date",
    "updated_at",
    "current_mileage",
    "liters_amount",
    "price_per_liter",
    "total_amount",
    "vehicle_license_plate",
    "driver_name",
    "fuel_type_description",
    "branchName",
  ],
  defaultSort: { id: "created_at", desc: true },
  facets: {
    branchName: { param: "branchId", values: "uuid" },
    vehicle_license_plate: { param: "vehicleId", values: "uuid" },
    fuel_type_description: { param: "fuelTypeId", values: "uuid" },
  },
});

/** The list's `meta.searchMeta`, as the API streams it. */
interface FuelListSearchMeta {
  total?: number;
  totalLiters?: number;
  totalAmount?: number;
  verifiedOdometer?: number;
  facets?: {
    branchId?: FacetCount[];
    vehicleId?: FacetCount[];
    fuelTypeId?: FacetCount[];
  };
}

type PageSearchParams = Record<string, string | string[] | undefined>;

/**
 * The sort and filter params to add to `/fuel/list-fuel` (and to the
 * export, decision 5.8), read from the page's searchParams. Next to page,
 * pageSize, search and businessId, which the page already sends.
 */
function fuelListQuery(
  searchParams: PageSearchParams | Pick<URLSearchParams, "get" | "getAll">,
): Record<string, string> {
  return serverTableQuery(searchParams, FUEL_TABLE);
}

/** Only the facets (the export has no order): what narrows the file. */
function fuelFilterQuery(
  searchParams: PageSearchParams | Pick<URLSearchParams, "get" | "getAll">,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(fuelListQuery(searchParams)).filter(
      ([name]) => name !== "sort" && name !== "order",
    ),
  );
}

export {
  FUEL_TABLE,
  fuelFilterQuery,
  fuelListQuery,
  type FuelListSearchMeta,
  type PageSearchParams,
};
