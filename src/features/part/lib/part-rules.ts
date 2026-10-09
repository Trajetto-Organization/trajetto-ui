import type { FacetCount } from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

/**
 * What the parts screens derive from a row and from the list's meta, in one
 * place (no directive: the server content, the client table and the tests
 * read it).
 */

/** One listed part, as the API streams it. */
interface PartRow {
  id: string;
  description: string;
  unit_price: number | string;
  businessId: string;
  supplierId: string | null;
  supplier?: { name: string } | null;
  business?: { corporate_reason: string } | null;
  created_at: string;
  updated_at: string;
  /** Service order lines using it: a used part cannot be deleted. */
  service_order_parts_count?: number;
}

/** The list's `meta.searchMeta`, as the API streams it. */
interface PartSearchMeta {
  total?: number;
  withSupplier?: number;
  withoutSupplier?: number;
  averagePrice?: number;
  facets?: { supplierId?: FacetCount[] };
}

/** Why a part may not be deleted, or null (the API decides again). */
function partDeleteBlockedReason(
  row: Pick<PartRow, "service_order_parts_count">,
): string | null {
  const lines = row.service_order_parts_count ?? 0;

  return lines > 0
    ? `Esta peça está em ${lines} lançamento(s) de ordem de serviço, que fazem parte do histórico de custos. Retire-a dessas ordens antes.`
    : null;
}

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/**
 * The cards, only from the server (decision 8.8). The old ones added up the
 * page's unit prices and called it "estimativa de estoque" — the catalog
 * keeps no stock, so that card is gone.
 */
function partStatsData(searchMeta: PartSearchMeta | undefined) {
  return {
    totalParts: searchMeta?.total ?? 0,
    withSupplier: searchMeta?.withSupplier ?? 0,
    withoutSupplier: searchMeta?.withoutSupplier ?? 0,
    averagePrice: currency.format(searchMeta?.averagePrice ?? 0),
  };
}

export {
  partDeleteBlockedReason,
  partStatsData,
  type PartRow,
  type PartSearchMeta,
};
