"use client";

import React, { ReactElement, useEffect, useMemo, useState } from "react";

import { usePresenceList } from "@/hooks/use-presence-list";

export interface AnimatedListProps {
  className?: string;
  children: React.ReactNode;
  delay?: number;
}

export const AnimatedList = React.memo(
  ({ className, children, delay = 1400 }: AnimatedListProps) => {
    const [index, setIndex] = useState(0);
    const childrenArray = React.Children.toArray(children);

    useEffect(() => {
      const interval = setInterval(() => {
        setIndex((prevIndex) => (prevIndex + 1) % childrenArray.length);
      }, delay);

      return () => clearInterval(interval);
    }, [childrenArray.length, delay]);

    const itemsToShow = useMemo(
      () => childrenArray.slice(0, index + 1).reverse(),
      [index, childrenArray],
    );

    // Keeps the outgoing card mounted while it collapses, so the stack below
    // slides up smoothly rather than jumping.
    const entries = usePresenceList(itemsToShow, (item) =>
      String((item as ReactElement).key),
    );

    return (
      <div className={`flex flex-col items-center gap-4 ${className}`}>
        {entries.map(({ key, item, exiting }) => (
          <AnimatedListItem key={key} exiting={exiting}>
            {item}
          </AnimatedListItem>
        ))}
      </div>
    );
  },
);

AnimatedList.displayName = "AnimatedList";

/**
 * Each item expands from a zero-height grid row on its first render, so the
 * items already on screen are pushed down by ordinary layout.
 *
 * That single CSS rule replaces what framer-motion needed three mechanisms for
 * here: `AnimatePresence` to keep exiting nodes around, the `layout` prop to
 * FLIP-animate the displacement, and a spring to drive it. See `.stack-item`
 * in globals.css.
 */
export function AnimatedListItem({
  children,
  exiting = false,
}: {
  children: React.ReactNode;
  exiting?: boolean;
}) {
  return (
    <div data-exiting={exiting} className="stack-item mx-auto w-full">
      <div>{children}</div>
    </div>
  );
}
