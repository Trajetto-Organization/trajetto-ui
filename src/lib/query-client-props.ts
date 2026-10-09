import { QueryClient } from "react-query";

import { STALE_ACTION_MESSAGE } from "@/lib/action-result";

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

      retry: (failureCount, error: any) => {
        // A 4xx answers the same on every attempt.
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }

        // A Server Action the server's build no longer has (see
        // lib/action-result) answers the same on every attempt: retrying
        // only holds the screen on its spinner before it can say so.
        if (error?.message === STALE_ACTION_MESSAGE) {
          return false;
        }

        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      keepPreviousData: true,
      useErrorBoundary: false,
    },
    mutations: {
      // A retried write could apply twice.
      retry: false,
      useErrorBoundary: false,
    },
  },
});

export { queryClientProps, CATALOG_STALE_TIME_MS };
