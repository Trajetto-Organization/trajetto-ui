"use client";

import { useRef, type MouseEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Tilts its content up to 5° toward the pointer (the design's panel
 * section), straight on the DOM so a mouse move costs no render. Touch and
 * reduced motion: still.
 */
const TiltStage = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): JSX.Element => {
  const inner = useRef<HTMLDivElement>(null);

  const onMove = (event: MouseEvent<HTMLDivElement>) => {
    const element = inner.current;
    if (
      !element ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    )
      return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    element.style.transform = `rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 5).toFixed(2)}deg)`;
  };

  const onLeave = () => {
    if (inner.current) inner.current.style.transform = "none";
  };

  return (
    <div
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={cn("[perspective:1600px]", className)}
    >
      <div
        ref={inner}
        className="transition-transform duration-500 ease-site will-change-transform"
      >
        {children}
      </div>
    </div>
  );
};

export { TiltStage };
