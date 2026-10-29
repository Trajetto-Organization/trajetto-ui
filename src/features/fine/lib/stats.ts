import type { FineListSearchMeta } from "./types";

/**
 * The fines cards, from the API's `searchMeta` only (decision 8.8).
 *
 * Both screens used to count "Pagas" and "Pendentes" over the ten rows of
 * the page while "Total" was the whole company, so the percentages added
 * up to nonsense on page 2. The numbers now come counted over the company,
 * with the search and every filter but the status one applied.
 */
interface FineCardsData {
  total: number;
  paid: number;
  pending: number;
  overdue: number;
  totalAmount: number;
  openAmount: number;
}

function fineCardsData(meta: FineListSearchMeta | undefined): FineCardsData {
  return {
    total: meta?.total ?? 0,
    paid: meta?.paid ?? 0,
    pending: meta?.pending ?? 0,
    overdue: meta?.overdue ?? 0,
    totalAmount: meta?.totalAmount ?? 0,
    openAmount: meta?.openAmount ?? 0,
  };
}

/** "4 (33%)", or "0" when there is nothing to take a share of. */
function countWithShare(part: number, total: number): string {
  if (total <= 0) return "0";

  return `${part} (${Math.round((part / total) * 100)}%)`;
}

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatAmount(value: number): string {
  return brl.format(value);
}

export { countWithShare, fineCardsData, formatAmount, type FineCardsData };
