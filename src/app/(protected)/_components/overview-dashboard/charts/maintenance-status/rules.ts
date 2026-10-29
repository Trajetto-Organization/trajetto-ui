/**
 * The thresholds behind "Manutenção da frota", as the API computes them
 * (trajetto-api src/modules/dashboard/repositories/maintenance-standing.ts,
 * DUE_SOON_DAYS). The card's hints and the Análise Gráfica tour both read
 * this one number; tests/unitaires/analytics-tutorial-copy.test.ts holds it
 * equal to the API's.
 */
const MAINTENANCE_DUE_SOON_DAYS = 30;

/** "inclui 1 sem registro" under "A vencer"; nothing when there is none. */
function unrecordedSentence(unrecorded: number | null | undefined): string {
  if (!unrecorded || unrecorded <= 0) return "";

  return `inclui ${unrecorded.toLocaleString("pt-BR")} sem registro`;
}

export { MAINTENANCE_DUE_SOON_DAYS, unrecordedSentence };
