"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ElementType,
} from "react";
import { flushSync } from "react-dom";

import { cn } from "@/lib/utils";

/**
 * Scroll reveal of the public site (the design's `data-reveal` / `data-grow`).
 *
 * The server HTML is the final state: visible, unmoved, readable by crawlers
 * and by anyone without JavaScript. Only after hydration does an element that
 * is still BELOW the fold get hidden (`data-site-reveal="hidden"`), before the
 * browser paints, and it animates in when it enters the viewport. Whatever is
 * already on screen at hydration stays as it was: hiding it would flash.
 * Reduced motion: nothing is ever hidden (and the CSS forces it visible).
 *
 * For entrances on page load (heroes), use the CSS `animate-tp-up` utility
 * instead: it runs without JavaScript.
 */

// useLayoutEffect warns during server rendering; the effect only matters in
// the browser, where it must run before paint.
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

type RevealVariant = "up" | "fade" | "grow-x" | "grow-y";

/** Same trigger as the design: 15% visible, 6% above the bottom edge. */
const OBSERVER_OPTIONS: IntersectionObserverInit = {
  threshold: 0.15,
  rootMargin: "0px 0px -6% 0px",
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * The fold checks of one commit, measured together.
 *
 * Measuring an element and hiding it right away, one Reveal at a time, made
 * every next measurement force a fresh layout (61 forced recalculations while
 * the home page hydrated). The layout effects only queue a check; one
 * microtask per commit, after React's commit and before the browser paints,
 * reads every position first and then applies every write.
 */
interface FoldCheck {
  /** The element whose position decides. */
  trigger: Element;
  /** The writes for an element found below the fold; returns their cleanup. */
  hide: () => () => void;
  /** Cleaned up before the flush: neither measured nor hidden. */
  cancelled: boolean;
  /** Undoes `hide`, once the flush ran it. */
  cleanup?: () => void;
}

let foldChecks: FoldCheck[] = [];

// queueMicrotask is missing on the oldest browsers Next 14 targets (Chrome
// 64-70, Safari 12.0); a resolved promise runs the same microtask there.
const scheduleMicrotask: (run: () => void) => void =
  typeof queueMicrotask === "function"
    ? (run) => queueMicrotask(run)
    : (run) => void Promise.resolve().then(run);

function flushFoldChecks(): void {
  const checks = foldChecks.filter(({ cancelled }) => !cancelled);
  foldChecks = [];

  if (
    checks.length === 0 ||
    prefersReducedMotion() ||
    typeof IntersectionObserver === "undefined"
  )
    return;

  // Reads only: one layout for the whole batch.
  const fold = window.innerHeight * 0.94;
  const below = checks.map(
    ({ trigger }) => trigger.getBoundingClientRect().top > fold,
  );

  // Writes only, nothing read in between. flushSync commits a count's zero
  // (React state) here too: set from a microtask it would wait for a later
  // task, and the final number would show for a frame before dropping to 0.
  flushSync(() => {
    checks.forEach((check, index) => {
      if (below[index]) check.cleanup = check.hide();
    });
  });
}

/**
 * Runs `hide` in this commit's flush if `trigger` is below the fold (the part
 * the observer would wait for) by then; never under reduced motion or without
 * IntersectionObserver. Returns the cleanup: before the flush it drops the
 * check, after it undoes `hide`.
 */
function whenBelowFold(trigger: Element, hide: () => () => void): () => void {
  const check: FoldCheck = { trigger, hide, cancelled: false };

  // The first check of a commit schedules the flush.
  if (foldChecks.push(check) === 1) scheduleMicrotask(flushFoldChecks);

  return () => {
    check.cancelled = true;
    check.cleanup?.();
  };
}

/**
 * Hides `element` if it is below the fold and reveals it on intersection.
 * Returns the cleanup. `onReveal` runs when it animates in (or never).
 * `trigger` is the element whose position decides (the element by default).
 * The check runs with the commit's other ones, still before the first paint.
 */
function observeReveal(
  element: HTMLElement,
  onReveal?: () => void,
  trigger: Element = element,
): () => void {
  return whenBelowFold(trigger, () => {
    element.setAttribute("data-site-reveal", "hidden");

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;

      observer.disconnect();
      // One frame between the hidden style and the transition, so the browser
      // has the start state to animate from.
      requestAnimationFrame(() => {
        element.setAttribute("data-site-reveal", "shown");
        onReveal?.();
      });
    }, OBSERVER_OPTIONS);

    observer.observe(trigger);

    return () => observer.disconnect();
  });
}

type RevealProps<T extends ElementType = "div"> = {
  /** The element to render (div by default): li, article, section… */
  as?: T;
  /** up (default): rise 28px + fade. fade. grow-x / grow-y: bars. */
  variant?: RevealVariant;
  /** Delay in ms, the design's `data-delay` for staggering siblings. */
  delay?: number;
} & Omit<ComponentPropsWithoutRef<T>, "as">;

const Reveal = <T extends ElementType = "div">({
  as,
  variant = "up",
  delay = 0,
  className,
  style,
  ...rest
}: RevealProps<T>): JSX.Element => {
  const ref = useRef<HTMLElement>(null);
  const Tag: ElementType = as ?? "div";

  useIsomorphicLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Bars of one chart are decided together by their track, so bars of
    // different heights never split between "already shown" and "waiting".
    const trigger = variant.startsWith("grow")
      ? (element.parentElement ?? element)
      : element;

    return observeReveal(element, undefined, trigger);
  }, [variant]);

  const origin =
    variant === "grow-x" ? "left" : variant === "grow-y" ? "bottom" : undefined;

  // The delay is a custom property that only the shown rules read (globals.css).
  // An inline transition-delay also applied to the hidden state, where a 0s
  // transition plus the delay hid the element late, all at once.
  return (
    <Tag
      ref={ref}
      data-variant={variant}
      className={cn(className)}
      style={{
        "--site-reveal-delay": delay ? `${delay}ms` : undefined,
        transformOrigin: origin,
        ...style,
      }}
      {...rest}
    />
  );
};

interface CountUpProps extends Omit<
  ComponentPropsWithoutRef<"span">,
  "children"
> {
  /** The final number, rendered as is on the server. */
  value: number;
  /** Duration in ms (the design's 1300). */
  duration?: number;
  /** Formats each frame, e.g. `(n) => n.toLocaleString("pt-BR")`. Client-only. */
  format?: (value: number) => string;
}

/**
 * A number that counts up from zero when it scrolls into view (the design's
 * `data-count`, ease-out cubic over 1.3s). Server HTML and no-JS show the
 * final value; a number already on screen at hydration is left alone.
 */
const CountUp = ({
  value,
  duration = 1300,
  format,
  ...rest
}: CountUpProps): JSX.Element => {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useIsomorphicLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    return whenBelowFold(element, () => {
      setShown(0);
      let frame = 0;

      const observer = new IntersectionObserver(([entry]) => {
        if (!entry?.isIntersecting) return;

        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const k = Math.min(1, (now - start) / duration);
          setShown(Math.round(value * (1 - Math.pow(1 - k, 3))));
          if (k < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      }, OBSERVER_OPTIONS);

      observer.observe(element);

      return () => {
        observer.disconnect();
        cancelAnimationFrame(frame);
        setShown(value);
      };
    });
  }, [value, duration]);

  return (
    <span ref={ref} {...rest}>
      {format ? format(shown) : shown}
    </span>
  );
};

export { CountUp, Reveal, observeReveal };
export type { CountUpProps, RevealProps, RevealVariant };
