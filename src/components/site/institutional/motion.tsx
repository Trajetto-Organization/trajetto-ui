"use client";

import {
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

/**
 * Small motion islands of the institutional pages. Each writes transforms or
 * CSS variables straight to the DOM inside one animation frame: no React
 * state, no re-render per scroll or pointer move. Reduced motion: nothing
 * moves. The server HTML is the still picture.
 */

function reducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

interface ParallaxSectionProps extends ComponentPropsWithoutRef<"section"> {
  children: ReactNode;
}

/**
 * A hero whose `[data-par="<factor>"]` children drift with the pointer and
 * rise with the scroll by their factor (design: Sobre · Hero).
 */
const ParallaxSection = ({
  children,
  className,
  ...rest
}: ParallaxSectionProps): JSX.Element => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = ref.current;
    if (!section || reducedMotion()) return;

    const layers = Array.from(
      section.querySelectorAll<HTMLElement>("[data-par]"),
    );
    let mx = 0;
    let my = 0;
    let frame = 0;

    const paint = () => {
      frame = 0;
      const y = window.scrollY;
      if (y > section.offsetHeight + 200) return;

      for (const layer of layers) {
        const f = Number(layer.dataset.par) || 0;
        layer.style.transform = `translate3d(${(mx * f * 70).toFixed(1)}px, ${(-y * f + my * f * 40).toFixed(1)}px, 0)`;
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
    <section ref={ref} className={className} {...rest}>
      {children}
    </section>
  );
};

interface ScrollDriftProps extends ComponentPropsWithoutRef<"div"> {
  /** Shift per px of distance from the viewport centre (the design's data-tpar). */
  factor: number;
  /** Only from this viewport width up (the design's 900px). */
  minWidth?: number;
}

/** Drifts vertically against the scroll, so a row of cards reads in depth. */
const ScrollDrift = ({
  factor,
  minWidth = 900,
  className,
  children,
  ...rest
}: ScrollDriftProps): JSX.Element => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || !factor || reducedMotion()) return;

    const wide = window.matchMedia(`(min-width: ${minWidth}px)`);
    let frame = 0;

    const paint = () => {
      frame = 0;
      if (!wide.matches) {
        element.style.transform = "";
        return;
      }
      const rect = element.getBoundingClientRect();
      const vh = window.innerHeight;
      if (rect.bottom < -200 || rect.top > vh + 200) return;
      element.style.transform = `translate3d(0, ${((rect.top + rect.height / 2 - vh / 2) * factor).toFixed(1)}px, 0)`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [factor, minWidth]);

  return (
    <div ref={ref} className={cn("will-change-transform", className)} {...rest}>
      {children}
    </div>
  );
};

/**
 * A card with a light that follows the pointer (design: Sobre ·
 * Diferenciais). Sets --mx / --my; the glow layer reads them.
 */
const SpotlightCard = ({
  className,
  children,
  ...rest
}: ComponentPropsWithoutRef<"article">): JSX.Element => {
  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse") return;
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    element.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    element.style.setProperty("--my", `${event.clientY - rect.top}px`);
  };

  return (
    <article onPointerMove={onPointerMove} className={className} {...rest}>
      {children}
    </article>
  );
};

export { ParallaxSection, ScrollDrift, SpotlightCard, reducedMotion };
