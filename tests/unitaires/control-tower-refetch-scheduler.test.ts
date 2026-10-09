import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createRefetchScheduler } from "@/features/control-tower/lib/refetch-scheduler";

/**
 * How realtime events turn into tower reads (review of UI-TWR-4).
 *
 * Every route event refetched the tower 1.5 s later: a big tenant settles a
 * stop every few seconds, and each open tab read five queries each time —
 * the 30-second poll multiplied by the fleet. The old debounce also restarted
 * on every event, so a steady stream never refetched at all.
 */
describe("createRefetchScheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const scheduler = (run: () => void) =>
    createRefetchScheduler({ run, settleMs: 1_500, minGapMs: 10_000 });

  it("turns a burst into one refetch after the settle time", () => {
    const run = vi.fn();
    const { schedule } = scheduler(run);

    for (let event = 0; event < 10; event += 1) schedule();

    vi.advanceTimersByTime(1_499);
    expect(run).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("refetches at most every ten seconds under a steady stream of events", () => {
    const run = vi.fn();
    const { schedule } = scheduler(run);

    // A stop settling every second for a minute.
    for (let second = 0; second < 60; second += 1) {
      schedule();
      vi.advanceTimersByTime(1_000);
    }

    vi.advanceTimersByTime(10_000);

    // Six or seven reads, not sixty — and not zero, like a restarting debounce.
    expect(run.mock.calls.length).toBeGreaterThanOrEqual(6);
    expect(run.mock.calls.length).toBeLessThanOrEqual(7);
  });

  it("answers a quiet panel's first event after the settle time only", () => {
    const run = vi.fn();
    const { schedule } = scheduler(run);

    schedule();
    vi.advanceTimersByTime(1_500);
    expect(run).toHaveBeenCalledTimes(1);

    // Long after the last read, a new event is not held for the gap.
    vi.advanceTimersByTime(60_000);

    schedule();
    vi.advanceTimersByTime(1_500);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("holds an event right after a read until the gap has passed", () => {
    const run = vi.fn();
    const { schedule } = scheduler(run);

    schedule();
    vi.advanceTimersByTime(1_500);

    // Ten seconds after the read, not 1.5 s after this event.
    schedule();
    vi.advanceTimersByTime(9_999);
    expect(run).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("drops what is pending when the panel goes away", () => {
    const run = vi.fn();
    const { schedule, dispose } = scheduler(run);

    schedule();
    dispose();

    vi.advanceTimersByTime(20_000);
    expect(run).not.toHaveBeenCalled();
  });
});
