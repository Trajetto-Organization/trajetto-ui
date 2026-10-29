import type { FineStatus } from "./types";

/**
 * How each payment status reads on the fines screen. The status itself is
 * the API's (decided on the company's business day); this only names it.
 */
const FINE_STATUS_META: Record<
  FineStatus,
  { label: string; className: string }
> = {
  PAID: {
    label: "Paga",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 " +
      "dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
  },
  PENDING: {
    label: "A vencer",
    className:
      "bg-amber-50 text-amber-800 border-amber-200 " +
      "dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  },
  OVERDUE: {
    label: "Vencida",
    className:
      "bg-red-50 text-red-700 border-red-200 " +
      "dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  },
};

const FINE_STATUS_LABELS: Record<FineStatus, string> = {
  PAID: FINE_STATUS_META.PAID.label,
  PENDING: FINE_STATUS_META.PENDING.label,
  OVERDUE: FINE_STATUS_META.OVERDUE.label,
};

export { FINE_STATUS_LABELS, FINE_STATUS_META };
