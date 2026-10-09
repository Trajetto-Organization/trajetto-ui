"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { prefersReducedMotion } from "./motion";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * The hero section with the design's depth effect: every `[data-par]` child
 * drifts with the scroll and the pointer, by its own factor. Pure transform
 * on a few elements, written in one rAF per event; off under reduced motion.
 */
const HeroStage = ({
  children,
  className,
  labelledBy,
}: {
  children: ReactNode;
  className?: string;
  labelledBy: string;
}): JSX.Element => {
  const ref = useRef<HTMLElement>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const frame = useRef(0);
  const enabled = useRef(false);

  const paint = () => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const root = ref.current;
      if (!root || !enabled.current) return;
      const y = window.scrollY;
      const { x: mx, y: my } = pointer.current;
      root.querySelectorAll<HTMLElement>("[data-par]").forEach((element) => {
        const f = Number(element.dataset.par) || 0;
        element.style.transform = `translate3d(${(mx * f * 60).toFixed(1)}px, ${(-y * f + my * f * 36).toFixed(1)}px, 0)`;
      });
    });
  };

  useEffect(() => {
    enabled.current = !prefersReducedMotion();
    if (!enabled.current) return;
    window.addEventListener("scroll", paint, { passive: true });
    paint();
    return () => {
      window.removeEventListener("scroll", paint);
      cancelAnimationFrame(frame.current);
    };
    // paint only reads refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section
      ref={ref}
      aria-labelledby={labelledBy}
      className={className}
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        pointer.current = {
          x: ((event.clientX - rect.left) / rect.width - 0.5) * 2,
          y: ((event.clientY - rect.top) / rect.height - 0.5) * 2,
        };
        paint();
      }}
      onMouseLeave={() => {
        pointer.current = { x: 0, y: 0 };
        paint();
      }}
    >
      {children}
    </section>
  );
};

/**
 * A hero number that counts up from zero as the page opens (the design's
 * `data-count` on the dashboard card, which is on screen at load). Server
 * HTML and no-JS show the final value; the reset happens before the first
 * paint after hydration, while the card is still fading in.
 */
const HeroCount = ({
  value,
  className,
}: {
  value: number;
  className?: string;
}): JSX.Element => {
  const [shown, setShown] = useState(value);

  useIsomorphicLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    setShown(0);
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / 1300);
      setShown(Math.round(value * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      setShown(value);
    };
  }, [value]);

  return <p className={className}>{shown}</p>;
};

export { HeroCount, HeroStage };
