import {
  assertServerTableSpec,
  serverTableQuery,
  type FacetCount,
  type ServerTableSpec,
} from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import type { PageSearchParams } from "./scope";

/**
 * The branch list's server-side table (decision 8.8). Sort keys and facets
 * are the API's (trajetto-api list-branch-schema / branch-list.ts); the
 * column ids match them, so the URL `sort` value is the column id. No
 * directive: the server content imports it too.
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

const BRANCH_STATUSES = ["active", "inactive"] as const;

const BRANCH_STATUS_LABELS: Record<(typeof BRANCH_STATUSES)[number], string> = {
  active: "Ativa",
  inactive: "Inativa",
};

const BRANCH_TABLE: ServerTableSpec = assertServerTableSpec({
  sortable: [
    "created_at",
    "updated_at",
    "corporate_reason",
    "fantasy_name",
    "cnpj",
    "city",
    "uf",
    "erp_code",
    "is_active",
  ],
  defaultSort: { id: "created_at", desc: true },
  facets: {
    // Column id → URL param. The status column is `is_active`.
    is_active: { param: "status", values: BRANCH_STATUSES },
    uf: { param: "uf", values: BRAZILIAN_UFS },
  },
});

/** A branch row as the list streams it. */
interface BranchRow {
  id: string;
  corporate_reason: string;
  fantasy_name: string | null;
  cep: string;
  city: string;
  uf: string;
  street: string;
  address_number: string;
  cnpj: string;
  complement: string | null;
  cnae: string;
  erp_code: string | null;
  responsible_name: string;
  telephone: string;
  email: string;
  is_active: boolean;
  businessId: string;
  created_at: string;
  updated_at: string;
}

/** The list's `meta.searchMeta`, as the API streams it. */
interface BranchSearchMeta {
  total?: number;
  active?: number;
  withErpCode?: number;
  withFantasyName?: number;
  facets?: { status?: FacetCount[]; uf?: FacetCount[] };
}

/** The sort and facet params to forward from the page's URL to the API. */
function branchListQuery(
  searchParams: PageSearchParams,
): Record<string, string> {
  return serverTableQuery(searchParams, BRANCH_TABLE);
}

export {
  BRANCH_STATUS_LABELS,
  BRANCH_STATUSES,
  BRANCH_TABLE,
  BRAZILIAN_UFS,
  branchListQuery,
  type BranchRow,
  type BranchSearchMeta,
};
