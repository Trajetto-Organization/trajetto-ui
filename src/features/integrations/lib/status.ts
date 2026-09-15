type WebhookDeliveryStatus = "PENDING" | "PROCESSING" | "DELIVERED" | "FAILED";

/**
 * The filter row, in the order somebody actually needs it.
 *
 * "Falharam" sits second, right after "Todos", because nobody opens this
 * screen to admire what worked — they open it because a customer called. A
 * filter row ordered by the enum would bury the reason for the visit.
 */
const STATUS_FILTERS: Array<{
  value: WebhookDeliveryStatus | "ALL";
  label: string;
}> = [
  { value: "ALL", label: "Todos" },
  { value: "FAILED", label: "Falharam" },
  { value: "PENDING", label: "Na fila" },
  { value: "DELIVERED", label: "Entregues" },
];

/**
 * Exhaustive by type, so a status added to the API cannot reach this screen as
 * a blank badge — the compiler asks for the word first.
 */
const STATUS_LABELS: Record<WebhookDeliveryStatus, string> = {
  PENDING: "Na fila",
  PROCESSING: "Enviando",
  DELIVERED: "Entregue",
  FAILED: "Falhou",
};

/**
 * Only a real failure is painted as one.
 *
 * PENDING and PROCESSING are the queue doing its job — we retry for six hours
 * — and colouring them red would have somebody resending events that were
 * about to go out on their own, which is how a duplicate reaches an ERP.
 */
const STATUS_TONES: Record<WebhookDeliveryStatus, string> = {
  PENDING: "border-amber-500/40 text-amber-600",
  PROCESSING: "border-sky-500/40 text-sky-600",
  DELIVERED: "border-emerald-500/40 text-emerald-600",
  FAILED: "border-destructive/40 text-destructive",
};

export { STATUS_FILTERS, STATUS_LABELS, STATUS_TONES };
export type { WebhookDeliveryStatus };
