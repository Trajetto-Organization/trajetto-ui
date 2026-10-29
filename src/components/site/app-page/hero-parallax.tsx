"use client";

import { useEffect, useRef, type ComponentPropsWithoutRef } from "react";

/**
 * The hero's depth effect (design: `data-par`): every descendant with
 * `data-par="<factor>"` drifts against the scroll and follows the pointer,
 * by factor × (60px horizontal, 36px vertical). Transforms only, batched in
 * one animation frame; nothing moves under reduced motion. The server HTML
 * is the resting position.
 */
const HeroParallax = (
  props: ComponentPropsWithoutRef<"section">,
): JSX.Element => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = ref.current;
    if (!section) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const layers = Array.from(
      section.querySelectorAll<HTMLElement>("[data-par]"),
    ).map((element) => ({
      element,
      factor: Number.parseFloat(element.dataset.par ?? "0") || 0,
    }));
    let mx = 0;
    let my = 0;
    let frame = 0;

    const paint = () => {
      frame = 0;
      const y = window.scrollY;
      // Past the hero nothing is visible; skip the work.
      if (y > section.offsetTop + section.offsetHeight) return;
      for (const { element, factor } of layers) {
        element.style.transform = `translate3d(${(mx * factor * 60).toFixed(1)}px, ${(-y * factor + my * factor * 36).toFixed(1)}px, 0)`;
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const rect = section.getBoundingClientRect();
      mx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      my = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      schedule();
    };
    const onLeave = () => {
      mx = 0;
      my = 0;
      schedule();
    };

    window.addEventListener("scroll", schedule, { passive: true });
    section.addEventListener("pointermove", onMove);
    section.addEventListener("pointerleave", onLeave);
    schedule();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <section ref={ref} {...props} />;
};

export { HeroParallax };
