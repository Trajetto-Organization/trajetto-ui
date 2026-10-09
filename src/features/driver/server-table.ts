import {
  assertServerTableSpec,
  serverTableQuery,
  type ServerTableSpec,
} from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import {
  CNH_CATEGORIES,
  CNH_CATEGORY_NONE,
  DRIVER_CONTRACT_LABELS,
  DRIVER_STATUS_LABELS,
} from "./lib/driver-rules";

/**
 * The driver list's server-side table (decision 8.8). Sort keys and facet
 * params are the API's (trajetto-api list-driver-schema); the column ids match
 * them, so the URL `sort` value is the column id. No directive: the server
 * content that asks the API imports this too.
 */
const DRIVER_TABLE: ServerTableSpec = assertServerTableSpec({
  sortable: [
    "created_at",
    "updated_at",
    "name",
    "status",
    "contract_type",
    "birth_date",
    "cnh_category",
    "cnh_expires_at",
    "city",
    "uf",
  ],
  defaultSort: { id: "created_at", desc: true },
  facets: {
    status: { param: "status", values: Object.keys(DRIVER_STATUS_LABELS) },
    contract_type: {
      param: "contract_type",
      values: Object.keys(DRIVER_CONTRACT_LABELS),
    },
    cnh_category: {
      param: "cnh_category",
      values: [...CNH_CATEGORIES, CNH_CATEGORY_NONE],
    },
    // The branch NAME column filters by branch id: the options (and their
    // names) come from the server, scoped to the company.
    branchName: { param: "branchId", values: "uuid" },
  },
});

const CNH_CATEGORY_FILTER_LABELS: Record<string, string> = {
  ...Object.fromEntries(CNH_CATEGORIES.map((category) => [category, category])),
  [CNH_CATEGORY_NONE]: "Não informada",
};

/** The page's searchParams (server) or the URL's (client). */
type ParamSource = Parameters<typeof serverTableQuery>[0];

/**
 * The sort and filter params to add to `/driver/list-driver` (and to the
 * export, decision 5.8), read from the page's searchParams.
 */
function driverListQuery(searchParams: ParamSource): Record<string, string> {
  return serverTableQuery(searchParams, DRIVER_TABLE);
}

export { CNH_CATEGORY_FILTER_LABELS, DRIVER_TABLE, driverListQuery };
