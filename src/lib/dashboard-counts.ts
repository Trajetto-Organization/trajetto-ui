/**
 * The overview's count cards, from GET /dashboard/overview.
 *
 * The cards showed what was CREATED this month: a company with twenty active
 * drivers registered last year read "Motoristas 0, -100% em relação ao mês
 * passado". The API now sends what a card shows (`value`) and what it is
 * compared with (`previous`), by `basis`: a catalogue's total against the
 * total when the month began, an operation's month so far against last month
 * up to the same point. Pure, and tested.
 */
type CountBasis = "total" | "month_to_date";

interface ApiEntityCount {
  currentMonth: number;
  lastMonth: number;
  basis?: CountBasis;
  value?: number;
  previous?: number;
}

interface CountCard {
  value: number;
  change: number;
  basis: CountBasis;
}

/** Whole percent; from zero, any growth reads +100% and none 0%. */
function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;

  return Math.round(((current - previous) / previous) * 100);
}

/** The card for one entity; an older API without `value` keeps the monthly reading. */
function countCard(count: ApiEntityCount): CountCard {
  const value = count.value ?? count.currentMonth;
  const previous = count.previous ?? count.lastMonth;

  return {
    value,
    change: percentChange(value, previous),
    basis: count.basis ?? "month_to_date",
  };
}

/**
 * The caption under the percentage, saying what it is compared with. Short on
 * purpose: "em relação ao mesmo período do mês passado" wrapped to three lines
 * and made its card taller than its neighbours, and "vs. mesmo período do mês
 * anterior" was still cut to "vs. mesmo período…" on the 3-column (1024px) and
 * 2-column (768px) grids, losing the word that gives it meaning. The "same
 * period" nuance lives in the full sentence (tooltip and screen readers).
 */
function comparisonLabel(basis: CountBasis | undefined): string {
  return basis === "total" ? "vs. início do mês" : "vs. mês anterior";
}

/** The full sentence, for the caption's tooltip. */
function comparisonDescription(basis: CountBasis | undefined): string {
  return basis === "total"
    ? "em relação ao total no início do mês"
    : "em relação ao mesmo período do mês anterior";
}

export { comparisonDescription, comparisonLabel, countCard, percentChange };
export type { ApiEntityCount, CountBasis, CountCard };
