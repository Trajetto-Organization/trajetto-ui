"use client";

import { RefObject, useEffect, useState } from "react";

interface UseInViewOptions {
  /** How much of the element must be visible, 0 to 1. */
  amount?: number;

  /** Stop observing after the first time it enters. Defaults to true. */
  once?: boolean;
}

/**
 * Reports whether an element has entered the viewport.
 *
 * Replaces framer-motion's `useInView` for the handful of places that need the
 * boolean itself rather than an animation — everything that only animates on
 * scroll uses the `Reveal` component instead, which needs no state in React at
 * all.
 */
function useInView(
  ref: RefObject<Element>,
  { amount = 0, once = true }: UseInViewOptions = {},
): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry], obs) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting && once) obs.disconnect();
      },
      { threshold: amount },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, amount, once]);

  return inView;
}

export { useInView };
