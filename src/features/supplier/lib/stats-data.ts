import type { SupplierSearchMeta } from "./server-table";

interface SupplierStatsData {
  totalSuppliers: number;
  withTelephone: number;
  withEmail: number;
  topStates: string;
}

/**
 * The cards' numbers, read ONLY from the API's `searchMeta` (decision 8.8).
 *
 * Both old screens took the total from the company and "com telefone", "com
 * e-mail" and "por estado" from the ten rows on screen: a company of 300
 * suppliers read "Com telefone: 4 (1%)" and changed its states card on every
 * page turn. No directive: pure, and tested without a DOM.
 */
function supplierStatsData(
  searchMeta: SupplierSearchMeta | undefined,
): SupplierStatsData {
  return {
    totalSuppliers: searchMeta?.total ?? 0,
    withTelephone: searchMeta?.withTelephone ?? 0,
    withEmail: searchMeta?.withEmail ?? 0,
    topStates: searchMeta?.topStates || "N/A",
  };
}

/** "12 (40%)", or "0" with nothing to divide by. */
function countWithShare(part: number, total: number): string {
  return total > 0 ? `${part} (${Math.round((part / total) * 100)}%)` : "0";
}

export { countWithShare, supplierStatsData, type SupplierStatsData };
