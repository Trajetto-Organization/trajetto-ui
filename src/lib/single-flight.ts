/**
 * One run per key at a time, shared by the callers racing it, and its answer
 * kept for a few seconds for the callers that arrive right after.
 *
 * Made for the middleware's session renewal. A page whose access token just
 * expired fires several requests at once (relay reads, an action, the
 * navigation), and each one used to POST /user/refresh-token with the same
 * refresh token. The API mints a sibling for a few of those presentations and
 * reads the next one as a stolen token — which ends the session on every
 * device. Sharing one renewal means one presentation, and every racing
 * request writes the same new cookies.
 *
 * Kept per server process (the middleware's module scope): replicas don't
 * share it, which is what the API's small sibling allowance is for.
 */
interface SingleFlightOptions<T> {
  /** How long a settled answer is handed to late callers. */
  keepMs: number;

  /** Entries kept at most; the oldest is dropped first. */
  maxEntries: number;

  /** Whether a settled answer may be reused (a transient failure isn't). */
  keep: (result: T) => boolean;

  now?: () => number;
}

interface Entry<T> {
  promise: Promise<T>;
  settledAt: number | null;
}

function createSingleFlight<T>({
  keepMs,
  maxEntries,
  keep,
  now = Date.now,
}: SingleFlightOptions<T>) {
  const entries = new Map<string, Entry<T>>();

  const sweep = (at: number) => {
    entries.forEach((entry, key) => {
      if (entry.settledAt !== null && at - entry.settledAt > keepMs) {
        entries.delete(key);
      }
    });
  };

  return function run(key: string, task: () => Promise<T>): Promise<T> {
    sweep(now());

    const existing = entries.get(key);

    if (existing) return existing.promise;

    if (entries.size >= maxEntries) {
      const oldest = entries.keys().next();

      if (!oldest.done) entries.delete(oldest.value);
    }

    const entry: Entry<T> = { promise: task(), settledAt: null };

    entries.set(key, entry);

    entry.promise.then(
      (result) => {
        if (keep(result)) entry.settledAt = now();
        else if (entries.get(key) === entry) entries.delete(key);
      },
      () => {
        if (entries.get(key) === entry) entries.delete(key);
      },
    );

    return entry.promise;
  };
}

export { createSingleFlight };
export type { SingleFlightOptions };
