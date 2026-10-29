import {
  assertServerTableSpec,
  serverTableQuery,
  type FacetCount,
  type ServerTableSpec,
} from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

/**
 * The quotes list's server-side table (decision 8.8). Sort keys and facets
 * are the API's (trajetto-api list-quotes-query-schema / quote-list.ts); the
 * column ids match them. No directive: the server content imports it too.
 */
const QUOTE_STATUSES = ["PENDING", "CONTACTED", "CLOSED", "CONVERTED"] as const;

const QUOTE_STATUS_LABELS: Record<(typeof QUOTE_STATUSES)[number], string> = {
  PENDING: "Pendente",
  CONTACTED: "Contatado",
  CLOSED: "Fechado",
  CONVERTED: "Convertido",
};

const QUOTE_FLEET_SIZES = [
  "1-5",
  "6-15",
  "16-30",
  "31-50",
  "51-100",
  "101+",
] as const;

const QUOTE_FLEET_SIZE_LABELS: Record<
  (typeof QUOTE_FLEET_SIZES)[number],
  string
> = {
  "1-5": "1 a 5 veículos",
  "6-15": "6 a 15 veículos",
  "16-30": "16 a 30 veículos",
  "31-50": "31 a 50 veículos",
  "51-100": "51 a 100 veículos",
  "101+": "Mais de 100 veículos",
};

const QUOTE_TABLE: ServerTableSpec = assertServerTableSpec({
  sortable: [
    "created_at",
    "updated_at",
    "name",
    "company",
    "email",
    "status",
    "contacted_at",
  ],
  defaultSort: { id: "created_at", desc: true },
  facets: {
    status: { param: "status", values: QUOTE_STATUSES },
    fleet_size: { param: "fleet_size", values: QUOTE_FLEET_SIZES },
  },
});

/** The list's `meta.searchMeta`, as the API streams it. */
interface QuoteSearchMeta {
  total?: number;
  pending?: number;
  contacted?: number;
  closed?: number;
  converted?: number;
  facets?: { status?: FacetCount[]; fleet_size?: FacetCount[] };
}

type PageSearchParams = Record<string, string | string[] | undefined>;

/** The sort and facet params to forward from the page's URL to the API. */
function quoteListQuery(
  searchParams: PageSearchParams,
): Record<string, string> {
  return serverTableQuery(searchParams, QUOTE_TABLE);
}

export {
  QUOTE_FLEET_SIZE_LABELS,
  QUOTE_FLEET_SIZES,
  QUOTE_STATUS_LABELS,
  QUOTE_STATUSES,
  QUOTE_TABLE,
  quoteListQuery,
  type PageSearchParams,
  type QuoteSearchMeta,
};
