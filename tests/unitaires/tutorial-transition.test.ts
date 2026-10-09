import { describe, expect, it, vi } from "vitest";

import { createStage } from "@/app/(protected)/_components/layout/protected-tutorial/engine/stage";

import {
  cardVisible,
  easeOutSite,
  flipTransform,
  initialTransitionState,
  morphRect,
  motionTimings,
  transitionReducer,
  type TransitionEvent,
  type TransitionState,
} from "@/app/(protected)/_components/layout/protected-tutorial/engine/transition";

/**
 * The step-transition state machine (engine/transition.ts). The copy the
 * card shows (`displayed`) may only change while it is out of sight, so the
 * previous step's text never shows at the new spot and the next step's text
 * never shows at the old one.
 */

type State = TransitionState<string>;

const run = (
  events: Array<TransitionEvent<string>>,
  from: State = initialTransitionState<string>(),
): State =>
  events.reduce((state, event) => transitionReducer(state, event), from);

const shownOn = (id: number, payload: string): State =>
  run([
    { type: "REQUEST", id },
    { type: "RESOLVED", id, payload },
    { type: "ENTER_DONE" },
  ]);

describe("transitionReducer", () => {
  it("opens hidden, enters once the first step resolves, then is shown", () => {
    const requested = run([{ type: "REQUEST", id: 1 }]);

    expect(requested.phase).toBe("resolving");
    expect(cardVisible(requested)).toBe(false);

    const entering = transitionReducer(requested, {
      type: "RESOLVED",
      id: 1,
      payload: "step 1",
    });

    expect(entering.phase).toBe("entering");
    expect(entering.displayed?.payload).toBe("step 1");
    expect(cardVisible(entering)).toBe(true);

    expect(transitionReducer(entering, { type: "ENTER_DONE" }).phase).toBe(
      "shown",
    );
  });

  it("keeps the previous copy on screen until it has faded out AND the next step resolved", () => {
    const leaving = transitionReducer(shownOn(1, "step 1"), {
      type: "REQUEST",
      id: 2,
    });

    expect(leaving.phase).toBe("leaving");
    expect(leaving.displayed?.payload).toBe("step 1");

    // Resolved first: still the old copy (it is mid-fade).
    const resolvedFirst = transitionReducer(leaving, {
      type: "RESOLVED",
      id: 2,
      payload: "step 2",
    });

    expect(resolvedFirst.phase).toBe("leaving");
    expect(resolvedFirst.displayed?.payload).toBe("step 1");

    // Faded: now the swap, with the new copy hidden while the card moves.
    const moving = transitionReducer(resolvedFirst, { type: "CONTENT_HIDDEN" });

    expect(moving.phase).toBe("moving");
    expect(moving.displayed?.payload).toBe("step 2");
    expect(moving.contentHidden).toBe(true);

    const shown = transitionReducer(moving, { type: "MOVE_DONE" });

    expect(shown.phase).toBe("shown");
    expect(shown.contentHidden).toBe(false);
  });

  it("swaps as soon as the step resolves when the fade already finished", () => {
    const faded = run(
      [{ type: "REQUEST", id: 2 }, { type: "CONTENT_HIDDEN" }],
      shownOn(1, "step 1"),
    );

    expect(faded.phase).toBe("leaving");
    expect(faded.displayed?.payload).toBe("step 1");

    const moving = transitionReducer(faded, {
      type: "RESOLVED",
      id: 2,
      payload: "step 2",
    });

    expect(moving.phase).toBe("moving");
    expect(moving.displayed?.payload).toBe("step 2");
  });

  it("ignores a resolution that arrives for a step already left (fast Próximo presses)", () => {
    const state = run(
      [
        { type: "REQUEST", id: 2 },
        { type: "REQUEST", id: 3 },
        { type: "CONTENT_HIDDEN" },
        { type: "RESOLVED", id: 2, payload: "step 2" },
      ],
      shownOn(1, "step 1"),
    );

    expect(state.phase).toBe("leaving");
    expect(state.displayed?.payload).toBe("step 1");

    const landed = transitionReducer(state, {
      type: "RESOLVED",
      id: 3,
      payload: "step 3",
    });

    expect(landed.displayed?.payload).toBe("step 3");
  });

  it("leaves a step mid-move without showing its copy again", () => {
    const moving = run(
      [
        { type: "REQUEST", id: 2 },
        { type: "CONTENT_HIDDEN" },
        { type: "RESOLVED", id: 2, payload: "step 2" },
      ],
      shownOn(1, "step 1"),
    );
    const leaving = transitionReducer(moving, { type: "REQUEST", id: 3 });

    expect(leaving.phase).toBe("leaving");
    // Already out of sight: no second fade to wait for.
    expect(leaving.contentHidden).toBe(true);
    expect(
      transitionReducer(leaving, { type: "RESOLVED", id: 3, payload: "step 3" })
        .phase,
    ).toBe("moving");
  });

  it("ignores late animation callbacks from another phase", () => {
    const shown = shownOn(1, "step 1");

    expect(transitionReducer(shown, { type: "MOVE_DONE" })).toBe(shown);
    expect(transitionReducer(shown, { type: "ENTER_DONE" })).toBe(shown);
    expect(transitionReducer(shown, { type: "CONTENT_HIDDEN" })).toBe(shown);
  });

  it("treats a repeated request for the step on screen as a no-op", () => {
    const shown = shownOn(1, "step 1");

    expect(transitionReducer(shown, { type: "REQUEST", id: 1 })).toBe(shown);
  });

  it("closes from any phase back to a hidden, empty card", () => {
    const closed = transitionReducer(shownOn(1, "step 1"), { type: "CLOSE" });

    expect(closed).toEqual(initialTransitionState());
    expect(cardVisible(closed)).toBe(false);
  });
});

describe("motion helpers", () => {
  it("are instant for someone who asked for less motion", () => {
    const reduced = motionTimings(true);

    expect([
      reduced.contentOutMs,
      reduced.contentInMs,
      reduced.moveMs,
      reduced.enterMs,
    ]).toEqual([0, 0, 0, 0]);

    const full = motionTimings(false);

    expect(full.moveMs).toBeGreaterThanOrEqual(220);
    expect(full.moveMs).toBeLessThanOrEqual(260);
  });

  it("eases out: starts at 0, ends at 1, never goes back, front-loaded", () => {
    expect(easeOutSite(0)).toBe(0);
    expect(easeOutSite(1)).toBe(1);

    let previous = 0;

    for (let t = 0.05; t < 1; t += 0.05) {
      const value = easeOutSite(t);

      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }

    expect(easeOutSite(0.5)).toBeGreaterThan(0.8);
  });

  it("morphs the spotlight between two targets, and grows from / shrinks to its own center", () => {
    const from = { top: 0, left: 0, width: 100, height: 40 };
    const to = { top: 200, left: 300, width: 50, height: 20 };

    expect(morphRect(from, to, 0)).toEqual(from);
    expect(morphRect(from, to, 1)).toEqual(to);
    expect(morphRect(from, to, 0.5)).toEqual({
      top: 100,
      left: 150,
      width: 75,
      height: 30,
    });

    // No previous spotlight (first step, or a centered one): a point at the new center.
    expect(morphRect(null, to, 0)).toEqual({
      top: 210,
      left: 325,
      width: 0,
      height: 0,
    });
    // To a centered step: shrinks to the old one's center.
    expect(morphRect(from, null, 1)).toEqual({
      top: 20,
      left: 50,
      width: 0,
      height: 0,
    });
    expect(morphRect(null, null, 0.5)).toBeNull();
  });

  it("computes the FLIP that draws the new box over the old one", () => {
    const first = { top: 100, left: 50, width: 448, height: 300 };
    const last = { top: 250, left: 900, width: 448, height: 200 };

    expect(flipTransform(first, last)).toEqual({
      dx: -850,
      dy: -150,
      sx: 1,
      sy: 1.5,
    });
    expect(flipTransform(last, last)).toEqual({ dx: 0, dy: 0, sx: 1, sy: 1 });
  });
});

describe("stale motion callbacks (review: fast double press)", () => {
  it("ignores a MOVE_DONE that belongs to an earlier step's move", () => {
    const shown = shownOn(1, "um");
    const movingToTwo = run(
      [
        { type: "REQUEST", id: 2 },
        { type: "CONTENT_HIDDEN" },
        { type: "RESOLVED", id: 2, payload: "dois" },
      ],
      shown,
    );

    expect(movingToTwo.phase).toBe("moving");

    // Pressed again mid-flight; step 3 resolves before step 2's move ends.
    const movingToThree = run(
      [
        { type: "REQUEST", id: 3 },
        { type: "RESOLVED", id: 3, payload: "três" },
      ],
      movingToTwo,
    );

    expect(movingToThree.phase).toBe("moving");
    expect(movingToThree.displayed?.payload).toBe("três");

    // Step 2's move reports late: the copy of step 3 must stay hidden.
    const stale = transitionReducer(movingToThree, {
      type: "MOVE_DONE",
      id: 2,
    });

    expect(stale.phase).toBe("moving");
    expect(stale.contentHidden).toBe(true);

    expect(
      transitionReducer(movingToThree, { type: "MOVE_DONE", id: 3 }).phase,
    ).toBe("shown");
  });
});

describe("createStage", () => {
  it("drops the callback of a flip superseded by the next one instead of firing it", () => {
    let now = 0;
    const frames: Array<() => void> = [];
    const win = {
      requestAnimationFrame: (callback: () => void) => frames.push(callback),
      cancelAnimationFrame: () => undefined,
      performance: { now: () => now },
    } as unknown as Window;
    const card = document.createElement("div");

    document.body.appendChild(card);

    const stage = createStage(
      () => ({ card, hole: null, glow: null }),
      motionTimings(false),
      win,
    );
    const first = vi.fn();
    const second = vi.fn();
    const from = { top: 0, left: 0, width: 100, height: 80 };

    stage.flipCardFrom(from, first);
    // Next pressed again 60 ms in, before the first flip reports done.
    now = 60;
    stage.flipCardFrom(from, second);

    expect(first).not.toHaveBeenCalled();

    // The second flip runs to its end and reports once.
    now = 1000;
    frames.splice(0).forEach((frame) => frame());

    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();

    stage.dispose();
    card.remove();
  });
});
