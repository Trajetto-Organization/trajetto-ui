/**
 * How a bill's status READS. The status itself is the API's (decision 8.4):
 * it is decided once, by the company's business day, and every screen shows
 * that answer. The five copies of `calculateAccountPayableStatus` that
 * compared `new Date()` with the due date's midnight — and called a bill
 * "Vencido" all through the day it was due — are gone.
 *
 * No directive: pure, shared by the table, the driver's page and the tests.
 */
type AccountPayableStatus =
  "PENDING" | "PARTIAL" | "OVERDUE" | "PARTIAL_LATE" | "PAID" | "LATE";

type AccountPayableStatusGroup = "OPEN" | "OVERDUE" | "PAID";

interface StatusMeta {
  label: string;
  /** Badge colours, light and dark. */
  className: string;
}

const STATUS_META: Record<AccountPayableStatus, StatusMeta> = {
  PENDING: {
    label: "Pendente",
    className:
      "border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200",
  },
  PARTIAL: {
    label: "Parcial",
    className:
      "border-purple-200 bg-purple-100 text-purple-800 dark:border-purple-900 dark:bg-purple-950 dark:text-purple-200",
  },
  OVERDUE: {
    label: "Vencida",
    className:
      "border-red-200 bg-red-100 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
  },
  PARTIAL_LATE: {
    label: "Parcial com atraso",
    className:
      "border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-200",
  },
  PAID: {
    label: "Paga",
    className:
      "border-green-200 bg-green-100 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200",
  },
  LATE: {
    label: "Paga com atraso",
    className:
      "border-yellow-200 bg-yellow-100 text-yellow-900 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-200",
  },
};

/** The filter's options: the three situations the cards count. */
const STATUS_GROUP_LABELS: Record<AccountPayableStatusGroup, string> = {
  OPEN: "Em aberto",
  OVERDUE: "Vencida",
  PAID: "Paga",
};

const UNKNOWN: StatusMeta = {
  label: "—",
  className: "border-gray-200 bg-gray-100 text-gray-700",
};

/** A status this build does not know (a newer API) still renders. */
function statusMetaOf(status: string | null | undefined): StatusMeta {
  return status && status in STATUS_META
    ? STATUS_META[status as AccountPayableStatus]
    : UNKNOWN;
}

/** Whether the bill can still be deleted: only one with no payment. */
function isDeletable(bill: {
  payment_date: string | null;
  amount_paid: number | null;
}): boolean {
  return !bill.payment_date && !bill.amount_paid;
}

export {
  STATUS_GROUP_LABELS,
  STATUS_META,
  isDeletable,
  statusMetaOf,
  type AccountPayableStatus,
  type AccountPayableStatusGroup,
  type StatusMeta,
};
