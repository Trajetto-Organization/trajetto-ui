"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { getSocket, initializeSocket, onRealtimeResync } from "@/socket";
import { queryClientProps } from "@/lib/query-client-props";

import {
  EVENT_MIN_GAP_MS,
  EVENT_SETTLE_MS,
  createRefetchScheduler,
} from "@/features/control-tower/lib/refetch-scheduler";

import { useOperationsSubscription } from "./use-operations-subscription";

/**
 * Keeps the dispatcher's screens honest while the operation moves.
 *
 * The API has emitted `routeEvent` — released, started, cancelled, completed,
 * and every stop that settles — since routes existed. Nothing listened. Not
 * the web, not the app: a repository-wide search for the event name found the
 * emitter and no consumer at all.
 *
 * So a dispatcher watching the Rotas board saw a route as RELEASED for as
 * long as they left the tab open, while the driver had left an hour earlier.
 * The only way to learn anything was to press Atualizar, and a screen that
 * has to be poked is a screen people stop believing.
 *
 * What this does NOT do is patch rows from the event payload. The payload
 * carries an id and a status, not the route's progress, its stops or its
 * occurrences — a board rebuilt from it would drift from the database within
 * minutes. It invalidates and refetches, which is the same path the user's
 * own actions already take.
 */

/**
 * How long a burst of events gathers before the refresh.
 *
 * A route finishing its last twelve stops produces twelve events in a few
 * seconds, and one refresh per event is twelve full page renders for one
 * truck arriving. The same window the Torre and the monitoring board use
 * (lib/refetch-scheduler).
 */
const SETTLE_MS = EVENT_SETTLE_MS;

/**
 * The shortest gap between two refreshes of the page.
 *
 * This used to be a 1.2 s trailing debounce with no max wait. Under a steady
 * stream (a big tenant settles a stop every few seconds all day) it restarted
 * on every event and NEVER fired: Entregas and Rotas stopped following the
 * operation exactly when it was busiest. And events a few seconds apart each
 * paid a full `router.refresh()`. Coalesced instead: one refresh per burst,
 * never two within ten seconds, the reasons that arrive meanwhile riding
 * along with the next one.
 */
const MIN_GAP_MS = EVENT_MIN_GAP_MS;

/**
 * How often to look again once a refresh is being held back.
 *
 * Only runs while there IS something held back and a dialog is open, so it is
 * one `querySelector` every couple of seconds during an edit — not a poll the
 * product pays for the rest of the time.
 */
const RETRY_MS = 2_000;

/**
 * What a route event makes stale besides the server-rendered board: the
 * route and delivery detail dialogs, the proof queue (a stop settles with a
 * receipt) and the list of deliveries a route can still take. Invalidated,
 * not refetched blindly: only what is on screen asks the API again.
 */
const ROUTE_EVENT_QUERY_ROOTS = [
  "route-detail",
  "delivery-detail",
  "proof_audit",
  "unrouted-deliveries",
  // The trail of a route drawn on its map grows with every stop worked.
  "route-trail",
] as const;

/**
 * Whether anything is open over the page right now.
 *
 * `router.refresh()` re-runs the server component, and every listing in this
 * product renders behind a Suspense boundary — so a refresh re-suspends it,
 * swaps in the loading skeleton and UNMOUNTS the table. Any dialog rendered
 * from a row goes with it, along with whatever the user had typed or
 * reordered in it.
 *
 * That is not a hypothetical. A dispatcher editing a route's stops lost the
 * panel mid-edit because a colleague released a different route on the other
 * side of the office: the event arrived, the board refreshed, the panel was
 * gone. Nobody is reading the board underneath a modal anyway, so the refresh
 * waits for the modal to close — it is deferred, never dropped.
 */
function isCoveredByDialog(): boolean {
  if (typeof document === "undefined") return false;

  const panels = document.querySelectorAll<HTMLElement>(
    '[role="dialog"], [role="alertdialog"]',
  );

  /**
   * Visible, not merely present.
   *
   * Some overlays keep a `role="dialog"` node mounted and hidden — the
   * command palette is one. Counting those would hold the refresh back
   * FOREVER on every page that renders one, which is a worse bug than the one
   * this function exists to prevent: instead of a panel closing unexpectedly,
   * the board would silently stop following the operation.
   */
  return [...panels].some((panel) => panel.getClientRects().length > 0);
}

/**
 * @param _tags Not read any more. The board used to revalidate its cache tag
 *   here too, which under the protected tree's `only-no-store` only produced
 *   a second full render next to `router.refresh()`.
 */
function useRouteEvents(businessId?: string, _tags?: string[]): void {
  const router = useRouter();

  /*
    Only a MASTER needs to ask: everybody with a company of their own is put
    in its operations room at handshake time, and `businessId` is undefined on
    the dashboard surface precisely because there is nothing to choose. The
    hook no-ops in that case.
  */
  useOperationsSubscription(businessId);

  useEffect(() => {
    // Deliberately NOT gated on `businessId`. The listener has to bind on the
    // dashboard surface too, where the room was joined by the server and the
    // id never reaches this component.
    let held: ReturnType<typeof setInterval> | null = null;

    let disposed = false;

    /**
     * `router.refresh()` alone re-runs the server component with fresh data:
     * the protected tree fetches with `fetchCache = "only-no-store"`, so
     * there is no cached listing for a tag to clear. (This used to call
     * `revalidateTags` as well, which re-rendered the page a second time.)
     * The dialogs' react-query caches are the other half.
     */
    const refresh = () => {
      if (disposed) return;

      if (isCoveredByDialog()) {
        // Held, not dropped: check back until the panel closes.
        if (!held) held = setInterval(refresh, RETRY_MS);

        return;
      }

      if (held) {
        clearInterval(held);
        held = null;
      }

      router.refresh();

      void queryClientProps.invalidateQueries({
        predicate: (query) => {
          const [root] = Array.isArray(query.queryKey)
            ? query.queryKey
            : [query.queryKey];

          return (ROUTE_EVENT_QUERY_ROOTS as readonly unknown[]).includes(root);
        },
      });
    };

    // One refresh per burst, never two within MIN_GAP_MS (see SETTLE_MS).
    const scheduler = createRefetchScheduler({
      run: refresh,
      settleMs: SETTLE_MS,
      minGapMs: MIN_GAP_MS,
    });

    const handle = () => scheduler.schedule();

    /*
      Awaited rather than read synchronously. On a first paint the socket does
      not exist yet — `useOperationsSubscription` above is what opens it — and
      a `getSocket()?.on(...)` there binds to nothing and never retries, which
      looks exactly like a board that is not live.

      The listener survives reconnections: socket.io keeps handlers on the
      same client instance and only the server-side ROOM has to be rejoined,
      which the subscription hook does on every `connect`.
    */
    initializeSocket()
      .then((socket) => {
        if (disposed) return;

        socket.on("routeEvent", handle);
      })
      .catch(() => {
        // No realtime at all: the screen still refetches on the Atualizar
        // button. There is no timer behind it.
      });

    /*
      What the rejoin above does NOT bring back is what happened while the
      socket was down: the API has no replay, and a route released during a
      deploy never arrives. So a reconnection is treated as one more event —
      same settle window, same hold behind an open dialog.
    */
    const stopResync = onRealtimeResync(handle);

    return () => {
      disposed = true;

      stopResync();

      scheduler.dispose();
      if (held) clearInterval(held);

      getSocket()?.off("routeEvent", handle);
    };
  }, [businessId, router]);
}

export {
  useRouteEvents,
  isCoveredByDialog,
  MIN_GAP_MS,
  SETTLE_MS,
  RETRY_MS,
  ROUTE_EVENT_QUERY_ROOTS,
};
