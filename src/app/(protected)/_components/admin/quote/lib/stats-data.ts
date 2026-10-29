import type { QuoteSearchMeta } from "./server-table";

interface QuoteStatsData {
  totalQuotes: number;
  pendingQuotes: number;
  contactedQuotes: number;
  convertedQuotes: number;
  /** What a stage's share is taken over: every stage, under the other filters. */
  stageBase: number;
}

/**
 * The cards' numbers, read ONLY from the API's `searchMeta` (decision 8.8).
 * The screen used to count "Pendentes", "Contatados" and "Convertidos" on
 * the ten rows of the page while "Total" was every quote's.
 *
 * The stage cards are a breakdown by the stage filter, so the API counts
 * them without it (disjunctive rule): their share is over all stages, not
 * over the filtered total — "Contatados" with "Pendente" picked is still a
 * share of the pipeline, never 300%.
 */
function quoteStatsData(
  searchMeta: QuoteSearchMeta | undefined,
): QuoteStatsData {
  const pending = searchMeta?.pending ?? 0;
  const contacted = searchMeta?.contacted ?? 0;
  const closed = searchMeta?.closed ?? 0;
  const converted = searchMeta?.converted ?? 0;

  return {
    totalQuotes: searchMeta?.total ?? 0,
    pendingQuotes: pending,
    contactedQuotes: contacted,
    convertedQuotes: converted,
    stageBase: pending + contacted + closed + converted,
  };
}

/** "12 (40%)", or "0" with nothing to divide by. */
function countWithShare(part: number, base: number): string {
  return base > 0 ? `${part} (${Math.round((part / base) * 100)}%)` : "0";
}

export { countWithShare, quoteStatsData, type QuoteStatsData };
