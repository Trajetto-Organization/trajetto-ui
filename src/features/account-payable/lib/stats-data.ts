import { formatToBrazilianCurrency } from "@/lib/format-values";

import type { AccountPayableSearchMeta } from "./server-table";

interface AccountPayableStatsData {
  totalAccounts: number;
  openAccounts: number;
  overdueAccounts: number;
  paidAccounts: number;
  /** "R$ 1.234,00 a pagar", from the API's sums. */
  openAmountLabel: string;
  overdueAmountLabel: string;
  paidAmountLabel: string;
}

/**
 * The cards' numbers, read ONLY from the API's `searchMeta` (decision 8.8).
 *
 * Both old screens took the total from the company but paid, pending and
 * overdue by `.filter` over the ten rows on screen, and put "Pago com
 * atraso" in both "pagas" and "atrasadas". The API counts each bill once, in
 * one of three situations, over the whole company. No directive: pure.
 */
function accountPayableStatsData(
  searchMeta: AccountPayableSearchMeta | undefined,
): AccountPayableStatsData {
  const money = (value: number | undefined) =>
    formatToBrazilianCurrency(value ?? 0);

  return {
    totalAccounts: searchMeta?.total ?? 0,
    openAccounts: searchMeta?.open ?? 0,
    overdueAccounts: searchMeta?.overdue ?? 0,
    paidAccounts: searchMeta?.paid ?? 0,
    openAmountLabel: `${money(searchMeta?.openAmount)} a pagar`,
    overdueAmountLabel: `${money(searchMeta?.overdueAmount)} em atraso`,
    paidAmountLabel: `${money(searchMeta?.paidAmount)} pagos`,
  };
}

/**
 * What the total card counts. The API counts the cards by the disjunctive
 * rule (table-infra): the search and the category apply, the situation
 * filter does not — so the three situation cards still add up to it. The
 * old "Na busca e nos filtros atuais" read 12 beside a table of 2 when
 * "Vencidas" was picked.
 */
const TOTAL_ACCOUNTS_DESCRIPTION =
  "Em qualquer situação, na busca e na categoria atuais";

/** "12 (40%)", or "0" with nothing to divide by. */
function countWithShare(part: number, total: number): string {
  return total > 0 ? `${part} (${Math.round((part / total) * 100)}%)` : "0";
}

/** Who is paid: the registered supplier, or the free-text name. */
function payeeLabel(bill: {
  supplier?: { name: string } | null;
  payee_name: string | null;
}): string | null {
  return bill.supplier?.name ?? bill.payee_name ?? null;
}

export {
  TOTAL_ACCOUNTS_DESCRIPTION,
  accountPayableStatsData,
  countWithShare,
  payeeLabel,
  type AccountPayableStatsData,
};
