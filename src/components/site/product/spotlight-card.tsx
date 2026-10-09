"use client";

import type { MouseEvent, ReactNode } from "react";

import { Reveal } from "@/components/site/reveal";
import { cn } from "@/lib/utils";

import styles from "./product.module.css";

/**
 * A feature card that reveals on scroll and carries a soft light under the
 * pointer (the design's `spot` handler). The light is a CSS gradient placed
 * by two custom properties, so a move costs one style write.
 */
const SpotlightCard = ({
  children,
  delay,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}): JSX.Element => (
  <Reveal
    as="article"
    delay={delay}
    onMouseMove={(event: MouseEvent<HTMLElement>) => {
      const element = event.currentTarget;
      const rect = element.getBoundingClientRect();
      element.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      element.style.setProperty("--my", `${event.clientY - rect.top}px`);
    }}
    className={cn("relative overflow-hidden", className)}
  >
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0", styles.spotlight)}
    />
    {children}
  </Reveal>
);

export { SpotlightCard };
