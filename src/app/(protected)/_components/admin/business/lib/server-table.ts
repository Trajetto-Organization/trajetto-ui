import {
  assertServerTableSpec,
  serverTableQuery,
  type FacetCount,
  type ServerTableSpec,
} from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

/**
 * The companies list's server-side table (decision 8.8). Sort keys and
 * facets are the API's (trajetto-api list-business-schema /
 * business-list.ts); the column ids match them, so the URL `sort` value is
 * the column id. No directive: the server content imports it too.
 */
const BRAZILIAN_UFS = [
  "AC",
  "AL",
  "AM",
  "AP",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MG",
  "MS",
  "MT",
  "PA",
  "PB",
  "PE",
  "PI",
  "PR",
  "RJ",
  "RN",
  "RO",
  "RR",
  "RS",
  "SC",
  "SE",
  "SP",
  "TO",
] as const;

const BUSINESS_STATUSES = ["active", "inactive"] as const;

const BUSINESS_STATUS_LABELS: Record<
  (typeof BUSINESS_STATUSES)[number],
  string
> = {
  active: "Ativa",
  inactive: "Inativa",
};

const BUSINESS_TABLE: ServerTableSpec = assertServerTableSpec({
  sortable: [
    "created_at",
    "updated_at",
    "corporate_reason",
    "fantasy_name",
    "cnpj",
    "city",
    "uf",
    "erp_code",
    "responsible_name",
    "email",
    "is_active",
  ],
  defaultSort: { id: "created_at", desc: true },
  facets: {
    // Column id → URL param. The status column is `is_active`.
    is_active: { param: "status", values: BUSINESS_STATUSES },
    uf: { param: "uf", values: BRAZILIAN_UFS },
  },
});

/** One place of the "Por Estado" / "Por Cidade" cards. */
interface PlaceCount {
  value: string;
  count: number;
}

/** The list's `meta.searchMeta`, as the API streams it. */
interface BusinessSearchMeta {
  total?: number;
  withErpCode?: number;
  topStates?: PlaceCount[];
  topCities?: PlaceCount[];
  facets?: { status?: FacetCount[]; uf?: FacetCount[] };
}

type PageSearchParams = Record<string, string | string[] | undefined>;

/** The sort and facet params to forward from the page's URL to the API. */
function businessListQuery(
  searchParams: PageSearchParams,
): Record<string, string> {
  return serverTableQuery(searchParams, BUSINESS_TABLE);
}

export {
  BRAZILIAN_UFS,
  BUSINESS_STATUS_LABELS,
  BUSINESS_STATUSES,
  BUSINESS_TABLE,
  businessListQuery,
  type BusinessSearchMeta,
  type PageSearchParams,
  type PlaceCount,
};
