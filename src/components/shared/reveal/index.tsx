"use client";

import { ComponentPropsWithoutRef, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type RevealDirection =
  "up" | "down" | "left" | "right" | "scale" | "scale-x" | "scale-y" | "none";

// Extends the div props so this is a true drop-in for the `motion.div` it
// replaces: `role`, `aria-*`, `id` and friends pass straight through instead of
// being silently dropped, which would have broken list semantics where the
// animated element IS the list item.
interface RevealProps extends ComponentPropsWithoutRef<"div"> {
  /** Where the element travels from. Mirrors the old `initial` offsets. */
  direction?: RevealDirection;

  /** Delay in milliseconds, for staggering siblings. */
  delay?: number;

  /** Duration in milliseconds. Defaults to the 600ms used across the site. */
  duration?: number;

  /** How much of the element must be visible before it animates, 0 to 1. */
  threshold?: number;
}

const DIRECTION_CLASS: Record<RevealDirection, string> = {
  up: "reveal-up",
  down: "reveal-down",
  left: "reveal-left",
  right: "reveal-right",
  scale: "reveal-scale",
  "scale-x": "reveal-scale-x",
  "scale-y": "reveal-scale-y",
  none: "",
};

/**
 * Fades content in as it enters the viewport — the replacement for
 * framer-motion's `initial` + `whileInView`.
 *
 * Why this is worth the swap: framer animates by writing inline styles from
 * JavaScript on every frame, which needs the whole library on the client. Here
 * the movement is a plain CSS transition on `opacity` and `transform`, so the
 * browser runs it on the compositor thread and the only JavaScript involved is
 * the observer that flips one class, once.
 *
 * It keeps the server rendering intact. This wrapper is a client component, but
 * `children` are passed in as a slot — whatever you nest inside is still
 * rendered on the server and ships no JavaScript of its own.
 *
 * Note the element renders transparent until the observer fires, exactly like
 * `initial={{ opacity: 0 }}` did before, so behaviour with JavaScript disabled
 * is unchanged from framer-motion.
 *
 * @example
 * <Reveal direction="up" delay={200}>
 *   <FeatureCard />
 * </Reveal>
 */
const Reveal = ({
  children,
  direction = "up",
  delay = 0,
  duration,
  threshold = 0.15,
  className,
  style,
  ...rest
}: RevealProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isIn, setIsIn] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry], obs) => {
        if (!entry.isIntersecting) return;

        setIsIn(true);

        // Runs once: the element never animates back out, so there is no
        // reason to keep observing it.
        obs.disconnect();
      },
      { threshold },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div
      ref={ref}
      className={cn(
        "reveal",
        DIRECTION_CLASS[direction],
        isIn && "is-in",
        className,
      )}
      style={{
        transitionDelay: delay ? `${delay}ms` : undefined,
        transitionDuration: duration ? `${duration}ms` : undefined,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
};

export { Reveal };
export type { RevealDirection, RevealProps };
