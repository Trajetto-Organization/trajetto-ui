/**
 * The rejection reason's rules, mirrored from the API
 * (review-proof-audit/rejection-reason.ts) so the reviewer hears about a
 * problem before pressing the button, in the same words.
 *
 * Edges are trimmed, the length is judged after trimming, and two blanks
 * inside a line are refused. Line breaks are allowed: the box is multi-line,
 * and decision 5.5 keeps the consecutive-spaces rule off them.
 */
const REJECTION_REASON_MIN = 5;
const REJECTION_REASON_MAX = 500;

const CONSECUTIVE_INLINE_BLANKS = /[^\S\r\n]{2,}/;

/** The message to show, or null when the reason can be sent (trimmed). */
function rejectionReasonProblem(raw: string): string | null {
  const reason = raw.trim();

  if (!reason) return "Diga por que o comprovante foi rejeitado.";

  if (reason.length < REJECTION_REASON_MIN) {
    return `O motivo da rejeição deve ter no mínimo ${REJECTION_REASON_MIN} caracteres.`;
  }

  if (reason.length > REJECTION_REASON_MAX) {
    return `O motivo da rejeição deve ter no máximo ${REJECTION_REASON_MAX} caracteres.`;
  }

  if (CONSECUTIVE_INLINE_BLANKS.test(reason)) {
    return "O motivo da rejeição não deve conter espaços consecutivos.";
  }

  return null;
}

export { REJECTION_REASON_MAX, REJECTION_REASON_MIN, rejectionReasonProblem };
