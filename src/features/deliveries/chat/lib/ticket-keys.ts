import type { TicketCounts } from "@/actions/chat/chat.types";

/**
 * What the Torre's first load needs from the tickets — the react-query roots
 * and the tab's badge — apart from ticket-rules, whose close-note schema
 * brings zod (~12.7 KB gzipped) to every page that imports it. The views
 * strip and the cadence read only these; ticket-rules re-exports them.
 */

/** The react-query roots the tickets live under. */
const TICKETS_QUERY_ROOT = "chat-tickets";
const TICKETS_SUMMARY_ROOT = "chat-tickets-summary";

/** The tab badge: unread open tickets, and a red dot while a request waits. */
function ticketBadge(counts: TicketCounts | null | undefined): {
  count: number;
  urgent: boolean;
} {
  return {
    count: counts?.unreadOpen ?? 0,
    urgent: (counts?.pendingAuthorization ?? 0) > 0,
  };
}

export { TICKETS_QUERY_ROOT, TICKETS_SUMMARY_ROOT, ticketBadge };
