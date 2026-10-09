import { test, expect } from "@playwright/test";

import {
  AXIS_LOCK_PX,
  EDGE_RESISTANCE,
  MIN_DISMISS_SCALE,
  resolveDismissCommit,
  resolveDismissProgress,
  resolveDismissStyle,
  resolveGestureAxis,
  resolveSwipeCommit,
  resolveTrackOffset,
} from "../../src/features/deliveries/chat/lib/gallery-gesture";

/** A phone-sized stage; the numbers below are all in its terms. */
const STAGE = { width: 390, height: 700 };

const MIDDLE = { canGoPrevious: true, canGoNext: true };
const FIRST = { canGoPrevious: false, canGoNext: true };
const LAST = { canGoPrevious: true, canGoNext: false };
const ALONE = { canGoPrevious: false, canGoNext: false };

test.describe("resolveGestureAxis", () => {
  test("says nothing until the drag has travelled far enough", () => {
    expect(resolveGestureAxis({ dx: 0, dy: 0 })).toBeNull();
    expect(resolveGestureAxis({ dx: 6, dy: 4 })).toBeNull();

    // Exactly on the lock is far enough.
    expect(resolveGestureAxis({ dx: AXIS_LOCK_PX, dy: 0 })).toBe("horizontal");
  });

  test("picks the axis the finger actually travelled", () => {
    expect(resolveGestureAxis({ dx: 60, dy: 12 })).toBe("horizontal");
    expect(resolveGestureAxis({ dx: -60, dy: 12 })).toBe("horizontal");
    expect(resolveGestureAxis({ dx: 10, dy: 80 })).toBe("vertical");
    expect(resolveGestureAxis({ dx: 10, dy: -80 })).toBe("vertical");
  });

  test("a tie goes to paging, because dismissing by accident costs more", () => {
    expect(resolveGestureAxis({ dx: 40, dy: 40 })).toBe("horizontal");
  });

  test("honours a caller that wants a different lock", () => {
    expect(resolveGestureAxis({ dx: 20, dy: 0 }, 40)).toBeNull();
    expect(resolveGestureAxis({ dx: 20, dy: 0 }, 10)).toBe("horizontal");
  });
});

test.describe("resolveTrackOffset", () => {
  test("follows the finger one for one in the middle of the gallery", () => {
    expect(resolveTrackOffset(120, MIDDLE)).toBe(120);
    expect(resolveTrackOffset(-120, MIDDLE)).toBe(-120);
  });

  test("resists, without refusing, where there is nothing to reach", () => {
    // Dragging right on the first photo asks for a previous that is not there.
    expect(resolveTrackOffset(120, FIRST)).toBeCloseTo(120 * EDGE_RESISTANCE);

    // ...and the other direction on the first photo is unimpeded.
    expect(resolveTrackOffset(-120, FIRST)).toBe(-120);

    expect(resolveTrackOffset(-120, LAST)).toBeCloseTo(-120 * EDGE_RESISTANCE);
    expect(resolveTrackOffset(120, LAST)).toBe(120);
  });

  test("resists both ways for a photo that is alone", () => {
    expect(resolveTrackOffset(120, ALONE)).toBeCloseTo(120 * EDGE_RESISTANCE);
    expect(resolveTrackOffset(-120, ALONE)).toBeCloseTo(-120 * EDGE_RESISTANCE);
  });

  test("stays put for a drag of nothing", () => {
    expect(resolveTrackOffset(0, MIDDLE)).toBe(0);
    expect(resolveTrackOffset(Number.NaN, MIDDLE)).toBe(0);
  });
});

test.describe("resolveSwipeCommit", () => {
  const swipe = (dx: number, elapsedMs: number, edges = MIDDLE): -1 | 0 | 1 =>
    resolveSwipeCommit({ dx, width: STAGE.width, elapsedMs, edges });

  test("dragging right goes back, dragging left goes forward", () => {
    expect(swipe(200, 400)).toBe(-1);
    expect(swipe(-200, 400)).toBe(1);
  });

  test("a slow drag that barely moved changes nothing", () => {
    expect(swipe(40, 900)).toBe(0);
    expect(swipe(-40, 900)).toBe(0);
  });

  test("a quick flick counts even though it is short", () => {
    // 60px in 80ms: well under the distance rule, well over the speed one.
    expect(swipe(-60, 80)).toBe(1);
  });

  test("a fast twitch is not a flick", () => {
    // Fast, but 8 pixels: this is a tap from an unsteady hand.
    expect(swipe(-8, 5)).toBe(0);
  });

  test("never steps off either end of the gallery", () => {
    expect(swipe(300, 400, FIRST)).toBe(0);
    expect(swipe(-300, 400, LAST)).toBe(0);

    // ...and a hard flick does not force it either.
    expect(swipe(300, 40, FIRST)).toBe(0);
    expect(swipe(-300, 40, LAST)).toBe(0);
  });

  test("a photo on its own never moves", () => {
    expect(swipe(300, 400, ALONE)).toBe(0);
    expect(swipe(-300, 400, ALONE)).toBe(0);
  });

  test("answers nothing for a stage it cannot measure", () => {
    expect(
      resolveSwipeCommit({
        dx: 300,
        width: 0,
        elapsedMs: 200,
        edges: MIDDLE,
      }),
    ).toBe(0);
  });
});

test.describe("resolveDismissProgress", () => {
  test("runs from nothing to fully dismissed", () => {
    expect(resolveDismissProgress(0, STAGE.height)).toBe(0);
    expect(resolveDismissProgress(STAGE.height, STAGE.height)).toBe(1);
  });

  test("reads the same up as it does down", () => {
    const down = resolveDismissProgress(140, STAGE.height);
    const up = resolveDismissProgress(-140, STAGE.height);

    expect(down).toBe(up);
    expect(down).toBeGreaterThan(0);
    expect(down).toBeLessThan(1);
  });

  test("answers zero for a stage it cannot measure", () => {
    expect(resolveDismissProgress(200, 0)).toBe(0);
  });
});

test.describe("resolveDismissStyle", () => {
  test("at rest the photo is whole and the backdrop is solid", () => {
    expect(resolveDismissStyle(0)).toEqual({ scale: 1, backdropOpacity: 1 });
  });

  test("fully thrown away, the conversation is what is left behind", () => {
    expect(resolveDismissStyle(1)).toEqual({
      scale: MIN_DISMISS_SCALE,
      backdropOpacity: 0,
    });
  });

  test("in between, the photo shrinks and the backdrop clears together", () => {
    const half = resolveDismissStyle(0.5);

    expect(half.scale).toBeLessThan(1);
    expect(half.scale).toBeGreaterThan(MIN_DISMISS_SCALE);

    expect(half.backdropOpacity).toBeCloseTo(0.5);
  });

  test("clamps a progress that has run past either end", () => {
    expect(resolveDismissStyle(-3)).toEqual({ scale: 1, backdropOpacity: 1 });
    expect(resolveDismissStyle(9).backdropOpacity).toBe(0);
  });
});

test.describe("resolveDismissCommit", () => {
  const drag = (dy: number, elapsedMs: number): boolean =>
    resolveDismissCommit({ dy, height: STAGE.height, elapsedMs });

  test("a long pull throws the photo away, up or down", () => {
    expect(drag(260, 600)).toBe(true);
    expect(drag(-260, 600)).toBe(true);
  });

  test("a short, slow pull springs back", () => {
    expect(drag(40, 900)).toBe(false);
    expect(drag(-40, 900)).toBe(false);
  });

  test("a quick flick down is enough on its own", () => {
    expect(drag(70, 90)).toBe(true);
  });

  test("a fast twitch is not a flick", () => {
    expect(drag(8, 5)).toBe(false);
  });

  test("answers no for a stage it cannot measure", () => {
    expect(resolveDismissCommit({ dy: 400, height: 0, elapsedMs: 300 })).toBe(
      false,
    );
  });
});
