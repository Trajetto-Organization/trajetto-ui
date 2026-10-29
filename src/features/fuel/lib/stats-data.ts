import type { FuelListSearchMeta } from "./server-table";

/**
 * The four cards' values, from the API's `searchMeta` only.
 *
 * Both copies of the page summed `liters_amount` and `total_amount` over the
 * ten rows on screen and labelled it "Total de Litros" / "Valor Total", and
 * counted verified odometers among those ten against the company's total —
 * "3 (25%)" of forty refuelings. The API now sums the whole filtered set.
 *
 * A number the API did not send stays undefined so the card can say "—"
 * rather than a confident zero (a rolling deploy can serve this page before
 * the API that sends the tally). No directive: pure, and tested.
 */
interface FuelStatsData {
  totalRefuelings: number;
  totalLiters: string;
  totalAmount: string;
  verifiedOdometer: number | undefined;
}

const UNKNOWN = "—";

function formatLiters(value: number | undefined): string {
  if (value === undefined || value === null) return UNKNOWN;

  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  })} L`;
}

function formatAmount(value: number | undefined): string {
  if (value === undefined || value === null) return UNKNOWN;

  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function buildFuelStatsData(
  total: number,
  searchMeta: FuelListSearchMeta | undefined,
): FuelStatsData {
  return {
    // The pager total is the same set the cards describe.
    totalRefuelings: searchMeta?.total ?? total ?? 0,
    totalLiters: formatLiters(searchMeta?.totalLiters),
    totalAmount: formatAmount(searchMeta?.totalAmount),
    verifiedOdometer: searchMeta?.verifiedOdometer,
  };
}

/** "3 (25%)" of the filtered set; "—" when the API sent no tally. */
function verifiedShare(data: Partial<FuelStatsData>): string {
  const verified = data.verifiedOdometer;
  const total = data.totalRefuelings ?? 0;

  if (verified === undefined || verified === null) return UNKNOWN;
  if (total <= 0) return "0";

  return `${verified} (${Math.round((verified / total) * 100)}%)`;
}

export { buildFuelStatsData, verifiedShare, type FuelStatsData };
