import { useCallback, useEffect, useRef } from "react";

/**
 * How often a burst of realtime reasons becomes a refetch.
 *
 * A route closing its last stops fires several events in a second: they are
 * one refetch after `settleMs`. And a big tenant settles a stop every few
 * seconds all day: every open tab refetching the tower (five queries, the
 * day's count among them) on each one was the 30-second poll multiplied by
 * the fleet. So a refetch never follows the previous one by less than
 * `minGapMs`; the reasons that arrive meanwhile ride along with it.
 *
 * Coalescing, not a trailing debounce: a debounce that restarts on every
 * event never fires while the events keep coming — the busiest moment of the
 * day would be the one the screen stops updating.
 */
interface RefetchSchedulerOptions {
  run: () => void;
  settleMs: number;
  minGapMs: number;

  now?: () => number;
  setTimer?: (callback: () => void, ms: number) => unknown;
  clearTimer?: (timer: unknown) => void;
}

interface RefetchScheduler {
  schedule: () => void;
  dispose: () => void;
}

function createRefetchScheduler({
  run,
  settleMs,
  minGapMs,
  now = () => Date.now(),
  setTimer = (callback, ms) => setTimeout(callback, ms),
  clearTimer = (timer) => clearTimeout(timer as ReturnType<typeof setTimeout>),
}: RefetchSchedulerOptions): RefetchScheduler {
  let timer: unknown = null;
  let lastRunAt = Number.NEGATIVE_INFINITY;

  return {
    schedule() {
      // Already on its way: this reason rides along.
      if (timer !== null) return;

      const delay = Math.max(settleMs, lastRunAt + minGapMs - now());

      timer = setTimer(() => {
        timer = null;
        lastRunAt = now();
        run();
      }, delay);
    },

    dispose() {
      if (timer !== null) clearTimer(timer);

      timer = null;
    },
  };
}

/** One tower read per burst of events: see createRefetchScheduler. */
const EVENT_SETTLE_MS = 1_500;

/** Event-driven refetches of one panel are at least ten seconds apart. */
const EVENT_MIN_GAP_MS = 10_000;

/**
 * A stable `schedule` for a component: the latest `run` is called, the timer
 * dies with the component.
 */
function useRefetchScheduler(
  run: () => void,
  { settleMs = EVENT_SETTLE_MS, minGapMs = EVENT_MIN_GAP_MS } = {},
): () => void {
  const latest = useRef(run);

  latest.current = run;

  const scheduler = useRef<RefetchScheduler | null>(null);

  if (scheduler.current === null) {
    scheduler.current = createRefetchScheduler({
      run: () => latest.current(),
      settleMs,
      minGapMs,
    });
  }

  useEffect(() => () => scheduler.current?.dispose(), []);

  return useCallback(() => scheduler.current?.schedule(), []);
}

export {
  EVENT_MIN_GAP_MS,
  EVENT_SETTLE_MS,
  createRefetchScheduler,
  useRefetchScheduler,
};
export type { RefetchScheduler, RefetchSchedulerOptions };
