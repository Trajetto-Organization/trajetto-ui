import type { MonitorStatusFilter, MonitorWindow } from "@/actions/integration";

type WebhookDeliveryStatus = "PENDING" | "PROCESSING" | "DELIVERED" | "FAILED";

/**
 * The filter row, in the order somebody actually needs it.
 *
 * "Falharam" sits second, right after "Todos", because nobody opens this
 * screen to admire what worked — they open it because a customer called. A
 * filter row ordered by the enum would bury the reason for the visit.
 *
 * "Na fila" is QUEUED — PENDING and PROCESSING together — which is exactly
 * what the "Na fila" card counts. It used to ask for PENDING alone: an event
 * being sent, or one whose attempt died with its process, was counted on the
 * card and never listed under the chip (DLVB-28).
 */
const STATUS_FILTERS: Array<{
  value: MonitorStatusFilter | "ALL";
  label: string;
}> = [
  { value: "ALL", label: "Todos" },
  { value: "FAILED", label: "Falharam" },
  { value: "QUEUED", label: "Na fila" },
  { value: "DELIVERED", label: "Entregues" },
];

/**
 * The period the cards AND the list cover (DLVB-29): rolling windows by the
 * event's creation. The queue is always everything still in flight.
 */
const MONITOR_WINDOWS: Array<{
  value: MonitorWindow;
  label: string;
  short: string;
}> = [
  { value: "24h", label: "24 horas", short: "24h" },
  { value: "7d", label: "7 dias", short: "7 dias" },
  { value: "30d", label: "30 dias", short: "30 dias" },
];

const windowShortLabel = (window: MonitorWindow): string =>
  MONITOR_WINDOWS.find((entry) => entry.value === window)?.short ?? window;

/**
 * The cards' labels for a period. The settled counters and the p95 name the
 * period; the queue is unqualified — it is everything still in flight.
 */
const monitorCardLabels = (window: MonitorWindow) => {
  const period = windowShortLabel(window);

  return {
    delivered: `Entregues (${period})`,
    failed: `Falharam (${period})`,
    pending: "Na fila",
    p95: `p95 (${period})`,
  };
};

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
 * PENDING and PROCESSING are the queue doing its job — we retry for about
 * seven hours — and colouring them red would have somebody resending events
 * that were about to go out on their own, which is how a duplicate reaches
 * an ERP.
 */
const STATUS_TONES: Record<WebhookDeliveryStatus, string> = {
  PENDING: "border-amber-500/40 text-amber-600",
  PROCESSING: "border-sky-500/40 text-sky-600",
  DELIVERED: "border-emerald-500/40 text-emerald-600",
  FAILED: "border-destructive/40 text-destructive",
};

/**
 * A send whose attempt died with its process: PROCESSING with the lease
 * already over. The dispatcher takes it again on its next pass; "Enviando"
 * forever would read as a hung request.
 */
const isStalled = (
  row: { status: WebhookDeliveryStatus; leaseExpiresAt?: string | null },
  now: number = Date.now(),
): boolean =>
  row.status === "PROCESSING" &&
  Boolean(row.leaseExpiresAt) &&
  new Date(row.leaseExpiresAt as string).getTime() < now;

/** The badge's word, telling a stalled send from one in flight. */
const statusLabelOf = (
  row: { status: WebhookDeliveryStatus; leaseExpiresAt?: string | null },
  now: number = Date.now(),
): string =>
  isStalled(row, now) ? "Envio interrompido" : STATUS_LABELS[row.status];

/**
 * When the queue will try a row again, or null when it will not.
 *
 * `availableAt` is the queue's key, not a schedule. The claim writes the
 * lease end into it, so a row being sent carries a moment minutes ahead, and
 * a row that was just delivered keeps it. Under "Próxima tentativa" that read
 * as "it will go out again" on an event already delivered — the prompt for a
 * manual resend, and a duplicate in the customer's ERP.
 */
const nextAttemptOf = (row: {
  status: WebhookDeliveryStatus;
  availableAt: string | null;
}): string | null => (row.status === "PENDING" ? row.availableAt : null);

/**
 * The pager's count. Past its cap the API stops counting (DLVB-30), and
 * "10.000 envios" would state a number that is not the count.
 */
const monitorTotalLabel = (
  total: number,
  capped: boolean | undefined,
): string =>
  capped
    ? `Mais de ${total.toLocaleString("pt-BR")} envios`
    : `${total.toLocaleString("pt-BR")} envios`;

export {
  MONITOR_WINDOWS,
  STATUS_FILTERS,
  STATUS_LABELS,
  STATUS_TONES,
  isStalled,
  monitorCardLabels,
  monitorTotalLabel,
  nextAttemptOf,
  statusLabelOf,
  windowShortLabel,
};
export type { WebhookDeliveryStatus };
