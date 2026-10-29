import type { OccurrenceRow } from "../lib/panels";

/**
 * How much earlier than its arrival a report must be dated before the
 * "Recebida em" cell also says when it happened.
 *
 * The app sends occurred_at on every report, online too: it is the tap, taken
 * before the GPS fix and the photo upload. Half a minute between tap and
 * arrival is an ordinary send on mobile data, and comparing at minute
 * precision labelled it a delayed one. Five minutes is a send that waited
 * (no signal, the offline queue), which the dispatcher needs to see.
 */
const DELAYED_REPORT_MS = 5 * 60_000;

/** occurred_at when the report arrived materially later; otherwise null. */
function delayedOccurredAt(
  row: Pick<OccurrenceRow, "created_at" | "occurred_at">,
): string | null {
  if (!row.occurred_at) return null;

  const gap = Date.parse(row.created_at) - Date.parse(row.occurred_at);

  return gap >= DELAYED_REPORT_MS ? row.occurred_at : null;
}

export { delayedOccurredAt };
