"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The hero's layered stage (design: Hero B · Camadas). Every child marked
 * `data-par="<factor>"` drifts with the pointer and rises with the scroll by
 * its factor, so the panel, the phone and the cards read as layers. The
 * transforms are written straight to the DOM in one animation frame: no
 * React state, no re-render per mouse move. Reduced motion: nothing moves.
 */
interface HeroParallaxProps {
  children: ReactNode;
  className?: string;
}

const HeroParallax = ({
  children,
  className,
}: HeroParallaxProps): JSX.Element => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = ref.current;
    if (!section) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const layers = Array.from(
      section.querySelectorAll<HTMLElement>("[data-par]"),
    );
    let mx = 0;
    let my = 0;
    let frame = 0;

    const paint = () => {
      frame = 0;
      const y = window.scrollY;
      // Past the hero nothing is visible to move.
      if (y > section.offsetHeight + 200) return;

      for (const layer of layers) {
        const f = Number(layer.dataset.par) || 0;
        layer.style.transform = `translate3d(${(mx * f * 60).toFixed(1)}px, ${(-y * f + my * f * 36).toFixed(1)}px, 0)`;
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

    section.addEventListener("pointermove", onMove);
    section.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", schedule, { passive: true });
    schedule();

    return () => {
      cancelAnimationFrame(frame);
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", schedule);
    };
  }, []);

  return (
    <section ref={ref} aria-labelledby="hero-titulo" className={cn(className)}>
      {children}
    </section>
  );
};

export { HeroParallax };
