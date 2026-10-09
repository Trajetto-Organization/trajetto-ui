import { formatCurrencyToNumber } from "@/lib/format-values";

/**
 * The price per litre as a pump shows it: up to three decimals.
 *
 * The column is Decimal(10,3) and the app records pump prices like R$ 5,899,
 * but the web formatted the price as money, with two digits: 5.899 read
 * "R$ 5,90" in the table and in the edit form, a pristine edit then counted
 * as changed, and saving it rewrote the price to 5,90. No directive: pure,
 * and tested.
 */
const PRICE_PER_LITER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
});

/** "R$ 5,899", "R$ 5,90"; the typed text ("5,899") or the API's number. */
function formatPricePerLiter(value: number | string | undefined): string {
  return PRICE_PER_LITER.format(formatCurrencyToNumber(value));
}

/**
 * What the price field keeps while the person types: digits and separators,
 * and no more than three digits after the decimal comma — a fourth one
 * would be rounded away by the database without anyone seeing it.
 */
function sanitizePriceTyping(raw: string): string {
  const kept = raw.replace(/[^\d,.]/g, "");
  const comma = kept.lastIndexOf(",");

  if (comma === -1) return kept;

  return (
    kept.slice(0, comma + 1) +
    kept
      .slice(comma + 1)
      .replace(/\D/g, "")
      .slice(0, 3)
  );
}

export { formatPricePerLiter, sanitizePriceTyping };
