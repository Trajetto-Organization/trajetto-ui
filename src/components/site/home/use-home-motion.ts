"use client";

import { useEffect, useState, type KeyboardEvent, type RefObject } from "react";

/**
 * Whether the visitor asked for less motion, kept in sync if the setting
 * changes mid-visit. False on the server and before hydration.
 */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);

    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  return reduced;
}

/**
 * Whether the element sits in the middle band of the viewport (between 15%
 * and 85% of its height), the design's condition for a demo to play: it
 * plays only while someone can watch it.
 */
function useInView(ref: RefObject<Element>): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(Boolean(entry?.isIntersecting)),
      { rootMargin: "-15% 0px -15% 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return inView;
}

/**
 * Arrow-key navigation of a tab list with automatic activation: ←/↑ and
 * →/↓ move (and wrap), Home and End jump. Returns the keydown handler.
 */
function tabListKeys(
  count: number,
  current: number,
  select: (index: number, focus: boolean) => void,
) {
  return (event: KeyboardEvent) => {
    let next: number | null = null;

    if (event.key === "ArrowDown" || event.key === "ArrowRight")
      next = (current + 1) % count;
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft")
      next = (current - 1 + count) % count;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = count - 1;

    if (next === null || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    select(next, true);
  };
}

export { tabListKeys, useInView, usePrefersReducedMotion };
