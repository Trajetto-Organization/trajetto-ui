"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { getSocket, initializeSocket } from "@/socket";
import { revalidateTags } from "@/actions/revalidate";

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
 * How long to wait before refetching.
 *
 * A route finishing its last twelve stops produces twelve events in a few
 * seconds, and one refetch per event is twelve full page renders for one
 * truck arriving. The window is long enough to collapse a burst and short
 * enough that nobody notices it — the alternative, refetching per event, is
 * how a realtime board becomes the heaviest read in the product.
 */
const SETTLE_MS = 1_200;

/**
 * How often to look again once a refresh is being held back.
 *
 * Only runs while there IS something held back and a dialog is open, so it is
 * one `querySelector` every couple of seconds during an edit — not a poll the
 * product pays for the rest of the time.
 */
const RETRY_MS = 2_000;

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

  return document.querySelector('[role="dialog"], [role="alertdialog"]') !== null;
}

function useRouteEvents(businessId?: string, tags = ["update-route"]): void {
  const router = useRouter();

  // The tags are usually a literal array at the call site, so a new one
  // arrives on every render; keeping them in a ref is what stops the effect
  // from tearing down and resubscribing forever.
  const tagsRef = useRef(tags);
  tagsRef.current = tags;

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
    let timer: ReturnType<typeof setTimeout> | null = null;
    let held: ReturnType<typeof setInterval> | null = null;

    let disposed = false;

    /**
     * Both halves are needed, and only one of them is visible in development.
     *
     * `router.refresh()` re-runs the server component. On its own that is
     * enough in `next dev`, which does not keep the Data Cache — which is
     * exactly why a mutation that deletes `revalidateTags` SURVIVES the
     * end-to-end test and is recorded here instead of pretended away.
     *
     * In production the listing is a `fetch` tagged `update-route`, its
     * result is cached, and a refresh with no invalidation re-renders the
     * page around the same stale rows. The tag is what makes the refetch
     * real; the refresh is what puts it on screen.
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

      void revalidateTags(tagsRef.current).then(() => {
        if (!disposed) router.refresh();
      });
    };

    const handle = () => {
      if (timer) clearTimeout(timer);

      timer = setTimeout(refresh, SETTLE_MS);
    };

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
        // No realtime at all: the screen still refetches on its timer and on
        // the Atualizar button.
      });

    return () => {
      disposed = true;

      if (timer) clearTimeout(timer);
      if (held) clearInterval(held);

      getSocket()?.off("routeEvent", handle);
    };
  }, [businessId, router]);
}

export { useRouteEvents, SETTLE_MS, RETRY_MS };
