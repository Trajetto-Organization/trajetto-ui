/**
 * How long to wait before trying again after the API refused a handshake.
 *
 * socket.io-client retries a dropped transport by itself, but a refusal from
 * the server's handshake middleware ends the socket for good (`active` goes
 * false), and nothing here called `connect()` again. A rate-limited handshake
 * during a deploy, or the database blinking mid-handshake, left the panel
 * without realtime — no error on screen — until somebody reloaded.
 *
 * Doubling from one second to a minute, with ±50% jitter: after a deploy every
 * open panel is refused at the same moment, and without jitter they would all
 * come back at the same moment too.
 */
const REFUSAL_RETRY_BASE_MS = 1_000;
const REFUSAL_RETRY_MAX_MS = 60_000;

function refusalRetryDelay(
  attempt: number,
  random: () => number = Math.random,
): number {
  const ceiling = Math.min(
    REFUSAL_RETRY_MAX_MS,
    REFUSAL_RETRY_BASE_MS * 2 ** Math.max(0, attempt),
  );

  return Math.round(ceiling * (0.5 + random()));
}

export { REFUSAL_RETRY_MAX_MS, refusalRetryDelay };
