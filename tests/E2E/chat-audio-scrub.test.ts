import { test, expect } from "@playwright/test";

import {
  boundsFromRect,
  hasSettledAt,
  isBarPlayed,
  ratioFromClientX,
  ratioFromSeconds,
  secondsFromRatio,
} from "../../src/features/deliveries/chat/lib/audio-scrub";

/** A track drawn from x=100 to x=300, with 8px of padding on each side. */
const RECT = { left: 100, width: 216 };
const INSETS = { left: 8, right: 8 };

test.describe("audio scrub geometry", () => {
  test("maps a click onto the painted track, padding discounted", () => {
    const bounds = boundsFromRect(RECT, INSETS);

    expect(bounds).toEqual({ left: 108, width: 200 });

    expect(ratioFromClientX(108, bounds)).toBe(0);
    expect(ratioFromClientX(208, bounds)).toBe(0.5);
    expect(ratioFromClientX(308, bounds)).toBe(1);
  });

  test("clamps anything outside the painted track", () => {
    const bounds = boundsFromRect(RECT, INSETS);

    // The padding itself, and the drag that ran off the end of the bar.
    expect(ratioFromClientX(100, bounds)).toBe(0);
    expect(ratioFromClientX(9_000, bounds)).toBe(1);
  });

  test("answers zero for a track that has not been laid out", () => {
    expect(ratioFromClientX(150, { left: 0, width: 0 })).toBe(0);
    expect(boundsFromRect({ left: 10, width: 4 }, INSETS).width).toBe(0);
  });

  test("round-trips a moment of the audio through its proportion", () => {
    expect(ratioFromSeconds(30, 120)).toBe(0.25);
    expect(secondsFromRatio(0.25, 120)).toBe(30);

    // Arrow keys past either end of the file.
    expect(ratioFromSeconds(-5, 120)).toBe(0);
    expect(ratioFromSeconds(300, 120)).toBe(1);
  });

  test("holds at zero while the duration is unknown", () => {
    expect(ratioFromSeconds(10, 0)).toBe(0);
    expect(secondsFromRatio(0.5, 0)).toBe(0);
    expect(ratioFromSeconds(10, Number.NaN)).toBe(0);
  });

  test("flips the bar under the pointer, not the one after it", () => {
    // Four bars: the first is played from the moment the click passes its
    // own middle, which is what makes the click feel exact.
    expect(isBarPlayed(0, 4, 0.1)).toBe(false);
    expect(isBarPlayed(0, 4, 0.125)).toBe(true);

    expect(isBarPlayed(3, 4, 0.874)).toBe(false);
    expect(isBarPlayed(3, 4, 1)).toBe(true);
  });
});

test.describe("audio scrub settling", () => {
  test("holds the released position while the element still reports the old one", () => {
    // Dragged from 0:10 to 1:00 on a note that was playing. These are the
    // frames that used to make the handle bounce back.
    const target = { from: 10, to: 60 };

    expect(hasSettledAt(10, target)).toBe(false);
    expect(hasSettledAt(10.4, target)).toBe(false);
    expect(hasSettledAt(42, target)).toBe(false);
  });

  test("lets go once the element arrives, exactly or near enough", () => {
    const target = { from: 10, to: 60 };

    expect(hasSettledAt(60, target)).toBe(true);

    // A media element lands on a decodable point, never on the request.
    expect(hasSettledAt(59.9, target)).toBe(true);
    expect(hasSettledAt(60.2, target)).toBe(true);
  });

  test("counts a forward scrub as arrived once playback carries past it", () => {
    // Releasing resumes playback, so the very next frames are already past
    // the asked-for second. Distance alone would never confirm this one.
    expect(hasSettledAt(63, { from: 10, to: 60 })).toBe(true);
  });

  test("reads a backward scrub from the other side", () => {
    const target = { from: 90, to: 30 };

    // Still where the audio was, and on its way down.
    expect(hasSettledAt(90, target)).toBe(false);
    expect(hasSettledAt(45, target)).toBe(false);

    expect(hasSettledAt(30, target)).toBe(true);
    expect(hasSettledAt(29.5, target)).toBe(true);
  });

  test("treats a click on the current position as already arrived", () => {
    expect(hasSettledAt(30, { from: 30, to: 30 })).toBe(true);
  });

  test("never settles on a position the element cannot state", () => {
    expect(hasSettledAt(Number.NaN, { from: 10, to: 60 })).toBe(false);
  });
});
