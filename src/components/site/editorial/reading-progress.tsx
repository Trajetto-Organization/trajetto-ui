"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * How far the reader is through the element `targetId`, 0..1, measured as
 * the design does: 0 when its top reaches 35% of the viewport, 1 when its
 * end is half a screen away. At most once per frame.
 */
function useReadingProgress(
  targetId: string,
  onChange: (progress: number) => void,
): void {
  const callback = useRef(onChange);
  callback.current = onChange;

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;

    let frame = 0;

    const measure = () => {
      frame = 0;
      const vh = window.innerHeight;
      const rect = target.getBoundingClientRect();
      const progress = Math.min(
        1,
        Math.max(
          0,
          (vh * 0.35 - rect.top) / Math.max(1, rect.height - vh * 0.5),
        ),
      );
      callback.current(progress);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [targetId]);
}

interface ReadingProgressProps {
  targetId: string;
  /** "accent": the article's category (`--acc`); "ink": the legal pages. */
  tone?: "accent" | "ink";
}

/**
 * The 3px bar on top of the viewport. Decorative (aria-hidden): the TOC and
 * the scroll position already tell where the reader is. Without JavaScript
 * it simply stays empty.
 */
const ReadingProgress = ({
  targetId,
  tone = "accent",
}: ReadingProgressProps) => {
  const barRef = useRef<HTMLDivElement>(null);

  useReadingProgress(targetId, (progress) => {
    if (barRef.current)
      barRef.current.style.transform = `scaleX(${progress.toFixed(4)})`;
  });

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[3px]"
    >
      <div
        ref={barRef}
        className={cn(
          "h-full origin-left scale-x-0",
          tone === "accent" ? "bg-[rgb(var(--acc))]" : "bg-site-ink",
        )}
      />
    </div>
  );
};

/** The legal TOC's "37%". */
const ReadingPercent = ({
  targetId,
  className,
}: {
  targetId: string;
  className?: string;
}) => {
  const [percent, setPercent] = useState(0);

  useReadingProgress(targetId, (progress) =>
    setPercent(Math.round(progress * 100)),
  );

  return <span className={className}>{percent}%</span>;
};

export { ReadingPercent, ReadingProgress, useReadingProgress };
