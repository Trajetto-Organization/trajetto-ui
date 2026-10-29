/**
 * "Already seen", per user and per tour.
 *
 * The flag used to be `tutorial_<path>` per browser: a second person on the
 * same computer never saw a tour, and the tours rewritten for decision 9.1
 * would never show to anyone who had dismissed the broken ones. `v2` makes
 * every fixed tour appear once more; the user id makes it personal.
 *
 * The `tutorial_` prefix stays on purpose: the browser suites suppress tours
 * by answering "true" for any key that starts with it.
 *
 * Every access is guarded: storage throws in private windows, with blocked
 * site data and in some embedded previews, and a tour is never worth a crash.
 */

const SEEN_VERSION = "v2";

function seenStorageKey(
  userId: string | null | undefined,
  tourKey: string,
): string {
  return `tutorial_${SEEN_VERSION}:${userId || "anon"}:${tourKey}`;
}

function hasSeenTour(
  userId: string | null | undefined,
  tourKey: string,
): boolean {
  try {
    return (
      window.localStorage.getItem(seenStorageKey(userId, tourKey)) === "true"
    );
  } catch {
    // Unreadable storage: treat as seen, so a tour does not reopen on every visit.
    return true;
  }
}

function markTourSeen(
  userId: string | null | undefined,
  tourKey: string,
): void {
  try {
    window.localStorage.setItem(seenStorageKey(userId, tourKey), "true");
  } catch {
    // Nothing to do: the tour simply may show again.
  }
}

export { SEEN_VERSION, hasSeenTour, markTourSeen, seenStorageKey };
