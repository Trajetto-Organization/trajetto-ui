import { QueryClient } from "react-query";

import { STALE_ACTION_MESSAGE } from "@/lib/action-result";
import { isRetryableReadError } from "@/lib/relay-read";

/**
 * How long a catalogue read by a picker (shipper, driver, occurrence type,
 * status reason…) is trusted before a new mount asks the API again.
 *
 * Short on purpose: another session can activate, deactivate or rename an
 * entry at any moment, and a dialog opened seconds later has to show it. It
 * only absorbs the burst of mounts one gesture causes (steps of a form, two
 * pickers of the same list), so the cached rows still render instantly and
 * the refetch fixes them in the background.
 */
const CATALOG_STALE_TIME_MS = 5_000;

/**
 * Whether a failed query may succeed if asked again: nothing answered (the
 * network), or the server side failed (5xx). A relay read rejects with its
 * real status (lib/relay-read); a 4xx answers the same every time. A plain
 * `Error` a screen threw from a Server Action's refusal carries no status
 * and is not retried: the API already said no. `fetch` itself rejects with a
 * TypeError when the request never got an answer.
 */
function isTransientQueryError(error: unknown): boolean {
  // A Server Action the server's build no longer has (see lib/action-result)
  // answers the same on every attempt.
  if (error instanceof Error && error.message === STALE_ACTION_MESSAGE) {
    return false;
  }

  if (isRetryableReadError(error)) return true;
  if (error instanceof TypeError) return true;

  const status = (error as { status?: unknown } | null)?.status;

  return typeof status === "number" && status >= 500;
}

const queryClientProps = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      cacheTime: 1000 * 60 * 30,

      // Pages re-read on mount and on reconnect; focus does not refetch
      // because the realtime hints (catalogChanged, sockets) and the
      // Atualizar button already cover cross-session changes.
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,

      // One more attempt, and only for a failure another attempt can fix.
      // It used to be three, one + two + four seconds apart, for anything
      // without a 4xx status, and a Server Action's refusal never carries
      // one: a failed read held its spinner ~7 s and, while it did, kept
      // Next's one-at-a-time action queue busy for every other read.
      retry: (failureCount, error: unknown) =>
        failureCount < 1 && isTransientQueryError(error),
      retryDelay: 1000,

      // Off: a query keyed by company would otherwise show the previous
      // company's rows under the new one while it loads (decision 2.6).
      // A paged or searched list that wants its rows held while the next
      // page loads opts in, and is remounted by company (`key={businessId}`).
      keepPreviousData: false,
      useErrorBoundary: false,
    },
    mutations: {
      // A retried write could apply twice.
      retry: false,
      useErrorBoundary: false,
    },
  },
});

export { queryClientProps, CATALOG_STALE_TIME_MS, isTransientQueryError };
