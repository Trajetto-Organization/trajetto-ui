"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export interface AnimatedListProps {
  className?: string;
  children: React.ReactNode;
  delay?: number;
}

/**
 * Cards kept mounted. The auth panel's box shows about three; the rest sit
 * below its clip edge, and the one that leaves the window is dropped there.
 */
export const FEED_WINDOW = 6;

/** The list's gap-4. */
const GAP_PX = 16;

// useLayoutEffect warns on the server; the slide only runs in a browser.
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * A feed: a new card pops in at the top every `delay` ms and the stack
 * slides down to make room, wrapping around the children forever.
 *
 * Only transform and opacity move, so the browser animates them on its
 * compositor: the motion keeps going while the page's main thread is busy.
 * The list used to transition grid-template-rows (a layout on the main
 * thread in every frame), with up to 50 cards mounted and all of them
 * collapsing at once when the loop restarted. In WebKit, where Turnstile's
 * iframe runs on the page's main thread, the panel froze for up to 0.65 s
 * whenever the captcha loaded (measured on /login, 31/10/2026).
 *
 * The slide is FLIP on the whole list: the new card is laid out at the top
 * (one layout per step, not per frame), the list is moved up by that card's
 * height and let go, and its transform transition (`.feed-list`) carries it
 * back down. The card pops in with a keyframe (`.feed-card`).
 *
 * With reduced motion the feed stands still, full: a picture, not a loop.
 */
export const AnimatedList = React.memo(
  ({ className, children, delay = 1400 }: AnimatedListProps) => {
    const items = React.Children.toArray(children);
    const count = items.length;

    // Steps since mount; each card keeps the step it came in on as its key.
    const [step, setStep] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (count === 0) return;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setStep(FEED_WINDOW - 1);
        return;
      }

      const interval = setInterval(() => setStep((value) => value + 1), delay);

      return () => clearInterval(interval);
    }, [count, delay]);

    useIsomorphicLayoutEffect(() => {
      const list = listRef.current;
      const entering = list?.firstElementChild as HTMLElement | null;

      if (!list || !entering || step === 0) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      // Back to where the cards were, with no transition; reading layout
      // commits that start, and clearing the inline style lets the class's
      // transition run from it.
      list.style.transition = "none";
      list.style.transform = `translateY(${-(entering.offsetHeight + GAP_PX)}px)`;
      void list.offsetHeight;
      list.style.transition = "";
      list.style.transform = "";
    }, [step]);

    if (count === 0) return null;

    const shown = Array.from(
      { length: Math.min(FEED_WINDOW, step + 1) },
      (_, at) => step - at,
    );

    return (
      <div
        ref={listRef}
        className={cn("feed-list flex flex-col items-center gap-4", className)}
      >
        {shown.map((entered) => (
          <div key={entered} className="feed-card mx-auto w-full">
            {items[entered % count]}
          </div>
        ))}
      </div>
    );
  },
);

AnimatedList.displayName = "AnimatedList";
