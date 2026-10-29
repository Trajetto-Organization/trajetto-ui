/**
 * The four checks a message of our own side can show, in the order they
 * happen: waiting for the API, accepted by it, handed to the driver's
 * phone, and finally opened by him.
 */
type ChatCheckState = "pending" | "sent" | "delivered" | "read";

interface CheckStateInput {
  /** ISO timestamp of the message being drawn. */
  createdAt: string;

  /** Optimistic message still in flight — the clock, not a check. */
  pending?: boolean;

  /** How far the driver's device has received; null when unknown. */
  counterpartDeliveredAt: string | null;

  /** How far the driver has read; null when he never opened the thread. */
  counterpartLastReadAt: string | null;
}

/**
 * True when `cursor` covers a message created at `createdAt`.
 *
 * Any falsy cursor means "no cursor", not just `null`: chat responses are
 * cast, never parsed, so a field the API has not shipped yet arrives as
 * `undefined` and must read as absent rather than as an invalid date.
 */
function isCoveredBy(createdAt: string, cursor: string | null): boolean {
  if (!cursor) return false;

  return new Date(createdAt) <= new Date(cursor);
}

/**
 * Decides which check a message shows out of the two counterpart cursors.
 *
 * Precedence is pending > read > delivered > sent, and "read" winning over
 * "delivered" is deliberate: the read cursor can legitimately sit ahead of
 * the delivery one, and a delivery receipt must never pull a message that
 * is already read back to a single grey pair of checks.
 */
function resolveCheckState({
  createdAt,
  pending,
  counterpartDeliveredAt,
  counterpartLastReadAt,
}: CheckStateInput): ChatCheckState {
  if (pending) return "pending";

  if (isCoveredBy(createdAt, counterpartLastReadAt)) return "read";

  if (isCoveredBy(createdAt, counterpartDeliveredAt)) return "delivered";

  return "sent";
}

export { resolveCheckState };
export type { ChatCheckState, CheckStateInput };
