import type { QuoteStatus } from "../quote.types";

/**
 * Why "Atualizar status" is blocked on a row, or null when it is not.
 *
 * Mirrors the API (update-quote-status refuses a CLOSED or CONVERTED quote),
 * so the menu explains the refusal instead of greying the item out mute
 * (decision 3.5).
 */
function quoteStatusBlockedReason(status: QuoteStatus): string | null {
  if (status === "CLOSED" || status === "CONVERTED") {
    return "Orçamento fechado ou convertido não muda de status.";
  }

  return null;
}

export { quoteStatusBlockedReason };
