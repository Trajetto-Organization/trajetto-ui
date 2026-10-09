/**
 * The route page's own plan writes, so their echo is never read as somebody
 * else's change (decision 14.7, §5.7).
 *
 * The API announces `route.stops_changed` BEFORE it answers, so the page's
 * own event reaches the socket while the write is still in flight and the
 * version on screen is the old one. Comparing with that version alone made
 * every pin, removal or add made during an unsaved order show "alterada por
 * outra pessoa" — whose Recarregar threw the order away.
 *
 * So: events that arrive while a write of this page is in flight wait; when
 * the last write settles they are replayed, and the versions those writes
 * produced are passed along as the page's own.
 */
type AdoptVersion = (version: number | null | undefined) => void;

interface OwnPlanWrites {
  /** Runs one write; `adopt` records each plan version it produced. */
  track: <T>(run: (adopt: AdoptVersion) => Promise<T>) => Promise<T>;

  /** Hands an event on now, or after the writes in flight settle. */
  receive: (incoming: unknown) => void;
}

function createOwnPlanWrites(
  deliver: (incoming: unknown, ownVersions: ReadonlySet<number>) => void,
): OwnPlanWrites {
  let inFlight = 0;
  let deferred: unknown[] = [];

  const versions = new Set<number>();

  const adopt: AdoptVersion = (version) => {
    if (typeof version === "number") versions.add(version);
  };

  const flush = () => {
    const pending = deferred;

    deferred = [];
    pending.forEach((incoming) => deliver(incoming, versions));
  };

  return {
    async track(run) {
      inFlight += 1;

      try {
        return await run(adopt);
      } finally {
        inFlight -= 1;

        if (inFlight === 0) flush();
      }
    },

    receive(incoming) {
      if (inFlight > 0) {
        deferred.push(incoming);
        return;
      }

      deliver(incoming, versions);
    },
  };
}

export { createOwnPlanWrites };
export type { AdoptVersion, OwnPlanWrites };
