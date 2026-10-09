import {
  assertServerTableSpec,
  serverTableQuery,
  type FacetCount,
  type ServerTableSpec,
} from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import type { PageSearchParams } from "./scope";

/**
 * The supplier list's server-side table (decision 8.8). Sort keys and the UF
 * facet are the API's (trajetto-api list-supplier-schema); the column ids
 * match them, so the URL `sort` value is the column id. No directive: the
 * server content imports it too.
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

const SUPPLIER_TABLE: ServerTableSpec = assertServerTableSpec({
  sortable: ["created_at", "updated_at", "name", "cnpj", "city", "uf"],
  defaultSort: { id: "created_at", desc: true },
  facets: {
    uf: { param: "uf", values: BRAZILIAN_UFS },
  },
});

/** A supplier row as the list streams it. */
interface SupplierRow {
  id: string;
  name: string;
  cnpj: string;
  cep: string | null;
  city: string | null;
  uf: string | null;
  street: string | null;
  address_number: string | null;
  complement: string | null;
  telephone: string | null;
  email: string | null;
  businessId: string;
  created_at: string;
  updated_at: string;
}

/** The list's `meta.searchMeta`, as the API streams it. */
interface SupplierSearchMeta {
  total?: number;
  withTelephone?: number;
  withEmail?: number;
  topStates?: string;
  facets?: { uf?: FacetCount[] };
}

/** The sort and UF params to forward from the page's URL to the API. */
function supplierListQuery(
  searchParams: PageSearchParams,
): Record<string, string> {
  return serverTableQuery(searchParams, SUPPLIER_TABLE);
}

export {
  BRAZILIAN_UFS,
  SUPPLIER_TABLE,
  supplierListQuery,
  type SupplierRow,
  type SupplierSearchMeta,
};
