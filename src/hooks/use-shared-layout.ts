"use client";

import { useLayoutEffect, useRef } from "react";

// Last known box for each shared id, kept outside React so it survives the
// unmount of one element and the mount of the next — which is the whole point:
// the two elements never exist at the same time.
const lastRects = new Map<string, DOMRect>();

interface UseSharedLayoutOptions {
  /** Duration in milliseconds. */
  duration?: number;
}

/**
 * Morphs an element from wherever the previously-rendered element with the same
 * `id` was, replacing framer-motion's `layoutId`.
 *
 * This is FLIP, the technique framer implements internally:
 *
 *   First  — the previous element's box, remembered in `lastRects`.
 *   Last   — this element's box, measured now.
 *   Invert — apply the transform that puts it visually back on the old box.
 *   Play   — animate that transform away.
 *
 * The inversion runs in `useLayoutEffect`, before the browser paints, so the
 * element is never seen in its final position first. Only `transform` is
 * animated, so the morph is composited and costs no layout.
 *
 * Falls back to doing nothing on the first render of an id — there is no
 * previous box to come from, which is the correct behaviour.
 */
function useSharedLayout<T extends HTMLElement>(
  id: string,
  { duration = 350 }: UseSharedLayoutOptions = {},
) {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const next = el.getBoundingClientRect();
    const prev = lastRects.get(id);

    lastRects.set(id, next);
    if (!prev || next.width === 0 || next.height === 0) return;

    const dx = prev.left - next.left;
    const dy = prev.top - next.top;

    const sx = prev.width / next.width;
    const sy = prev.height / next.height;

    // Nothing moved or resized — no animation to play.
    if (
      Math.abs(dx) < 1 &&
      Math.abs(dy) < 1 &&
      Math.abs(sx - 1) < 0.01 &&
      Math.abs(sy - 1) < 0.01
    ) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) return;

    const animation = el.animate(
      [
        {
          transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
          transformOrigin: "top left",
        },
        { transform: "none", transformOrigin: "top left" },
      ],
      { duration, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    );

    return () => animation.cancel();
  }, [id, duration]);

  return ref;
}

export { useSharedLayout };
