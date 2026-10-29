/**
 * At most one mark-read per window, always carrying the furthest stamp.
 *
 * Every driver message that landed on an open, focused conversation posted
 * its own mark-read, and each answer invalidated the thread list and the
 * unread badge: a burst of twenty messages was twenty POSTs and some forty
 * GETs for one visible change. The app fixed the same thing (MOB-09).
 *
 * Leading and trailing: the first read goes out at once — opening a
 * conversation clears its badge without waiting — and whatever arrives inside
 * the window leaves in ONE request at its end, with the newest stamp. The
 * cursor only advances, so the coalesced request loses nothing.
 */
interface ReadRequest {
  threadId: string;

  /** The newest message the reader has on screen; null = "up to now". */
  readAt: string | null;
}

interface ReadThrottle {
  request: (threadId: string, readAt: string | null) => void;

  /** Sends what is waiting right away (the pane is going away). */
  flush: () => void;

  /** Drops what is waiting without sending it. */
  cancel: () => void;
}

/** The later of two stamps; null (the server clock) covers everything. */
function furthest(a: string | null, b: string | null): string | null {
  if (a === null || b === null) return null;

  return new Date(b).getTime() > new Date(a).getTime() ? b : a;
}

function createReadThrottle(
  windowMs: number,
  send: (read: ReadRequest) => void,
): ReadThrottle {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: ReadRequest | null = null;

  const open = () => {
    timer = setTimeout(() => {
      timer = null;

      if (!pending) return;

      const next = pending;
      pending = null;

      send(next);

      // A send opens a new window, so a steady stream is still one request
      // per window and never one per message.
      open();
    }, windowMs);
  };

  return {
    request(threadId, readAt) {
      if (!timer) {
        send({ threadId, readAt });
        open();
        return;
      }

      pending =
        pending && pending.threadId === threadId
          ? { threadId, readAt: furthest(pending.readAt, readAt) }
          : { threadId, readAt };
    },

    flush() {
      if (timer) clearTimeout(timer);
      timer = null;

      if (!pending) return;

      const next = pending;
      pending = null;

      send(next);
    },

    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
      pending = null;
    },
  };
}

export { createReadThrottle, furthest };
export type { ReadThrottle, ReadRequest };
