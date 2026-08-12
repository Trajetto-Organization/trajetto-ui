"use client";

import { useCallback, useEffect, useRef } from "react";

interface UseTiltOptions {
  /** Maximum rotation on each axis, in degrees. */
  max?: number;
}

/**
 * Pointer-driven 3D tilt, as a replacement for framer-motion's
 * `useMotionValue` + `useTransform` + `useSpring` chain.
 *
 * How it keeps the spring feel without a physics engine: the rotation lives in
 * two CSS custom properties, and the TRANSITION changes with the state. While
 * the pointer is over the card the transition is nearly instant, so the card
 * tracks the cursor. On the way out the values go back to zero with a longer
 * `cubic-bezier(0.34, 1.56, 0.64, 1)` — a curve whose control point above 1
 * overshoots and settles, which is what reads as "springy".
 *
 * Only `transform` is written, so the browser composites it and never
 * recalculates layout. Updates are batched into one animation frame: a raw
 * `mousemove` handler can fire far more often than the screen refreshes, and
 * writing a style on every one of those events is wasted work.
 */
function useTilt<T extends HTMLElement>({ max = 8 }: UseTiltOptions = {}) {
  const ref = useRef<T>(null);

  const frame = useRef(0);
  const rect = useRef<DOMRect | null>(null);

  useEffect(() => {
    return () => cancelAnimationFrame(frame.current);
  }, []);

  const handlePointerEnter = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    // Measured once per hover instead of on every move: getBoundingClientRect
    // forces the browser to flush pending layout, and doing that mid-drag is
    // exactly how a smooth effect turns janky.
    rect.current = el.getBoundingClientRect();
    el.dataset.tilting = "true";
  }, []);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<T>) => {
      const el = ref.current;
      const box = rect.current;

      if (!el || !box) return;

      const { clientX, clientY } = event;

      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        const px = (clientX - box.left) / box.width - 0.5;
        const py = (clientY - box.top) / box.height - 0.5;

        el.style.setProperty("--tilt-y", `${px * max * 2}deg`);
        el.style.setProperty("--tilt-x", `${-py * max * 2}deg`);

        // Same pointer position, reused for the glare highlight so it does
        // not need a second listener.
        el.style.setProperty("--glare-x", `${(px + 0.5) * 100}%`);
        el.style.setProperty("--glare-y", `${(py + 0.5) * 100}%`);
      });
    },
    [max],
  );

  const handlePointerLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    cancelAnimationFrame(frame.current);
    delete el.dataset.tilting;

    el.style.setProperty("--tilt-x", "0deg");
    el.style.setProperty("--tilt-y", "0deg");
  }, []);

  return {
    ref,
    tiltProps: {
      onPointerEnter: handlePointerEnter,
      onPointerMove: handlePointerMove,
      onPointerLeave: handlePointerLeave,
    },
  };
}

export { useTilt };
