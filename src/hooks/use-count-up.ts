"use client";

import { useEffect, useState } from "react";

interface UseCountUpOptions {
  /** Duration in milliseconds. */
  duration?: number;

  /** Counting only starts once this is true. */
  enabled?: boolean;
}

// Ease-out cubic: fast at first, settling into the final value — the same
// curve framer's `animate(..., { ease: "easeOut" })` used here.
const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);

/**
 * Counts from zero up to `target`.
 *
 * This is the one animation on the site that CSS genuinely cannot express: it
 * animates a NUMBER rendered as text, not a style. framer-motion was pulled in
 * for exactly this, through its imperative `animate()`. A requestAnimationFrame
 * loop does the same in a few lines and ships nothing.
 */
function useCountUp(
  target: number,
  { duration = 2000, enabled = true }: UseCountUpOptions = {},
): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    // Anyone who asked the OS for less motion gets the final number straight
    // away, matching what the CSS animations do elsewhere.
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      setValue(target);
      return;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setValue(Math.floor(easeOut(progress) * target));

      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, enabled]);

  return value;
}

export { useCountUp };
