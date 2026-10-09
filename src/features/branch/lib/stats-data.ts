import type { BranchSearchMeta } from "./server-table";

interface BranchStatsData {
  totalBranches: number;
  active: number;
  /**
   * What the "Ativas" share is taken over. The API counts the card without
   * the status filter (disjunctive rule), so its base is every status under
   * the other filters — not the filtered total, which with "Inativa" picked
   * would read "Ativas: 11 (1100%)".
   */
  activeBase: number;
  withErpCode: number;
  withFantasyName: number;
}

/**
 * The cards' numbers, read ONLY from the API's `searchMeta` (decision 8.8).
 *
 * Both old screens took the total from the company and "com código ERP",
 * "com nome fantasia" and "com complemento" from the ten rows on screen: a
 * company of 40 branches read "Com código ERP: 3 (8%)" and changed on every
 * page turn. "Com complemento" said nothing about the operation and gave its
 * place to "Ativas". No directive: pure, and tested without a DOM.
 */
function branchStatsData(
  searchMeta: BranchSearchMeta | undefined,
): BranchStatsData {
  const statusOptions = searchMeta?.facets?.status;

  return {
    totalBranches: searchMeta?.total ?? 0,
    active: searchMeta?.active ?? 0,
    activeBase: statusOptions?.length
      ? statusOptions.reduce((sum, option) => sum + option.count, 0)
      : (searchMeta?.total ?? 0),
    withErpCode: searchMeta?.withErpCode ?? 0,
    withFantasyName: searchMeta?.withFantasyName ?? 0,
  };
}

/** "12 (40%)", or "0" with nothing to divide by. */
function countWithShare(part: number, total: number): string {
  return total > 0 ? `${part} (${Math.round((part / total) * 100)}%)` : "0";
}

export { branchStatsData, countWithShare, type BranchStatsData };
