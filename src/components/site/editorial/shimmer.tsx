import { cn } from "@/lib/utils";

/** The design's loading block: soft2 → surface → soft2 sweeping by. */
const Shimmer = ({ className }: { className?: string }) => (
  <div
    aria-hidden
    className={cn(
      "animate-tp-shimmer bg-[linear-gradient(90deg,rgb(var(--site-soft2))_0,rgb(var(--site-surface))_50%,rgb(var(--site-soft2))_100%)] bg-[length:800px_100%]",
      className,
    )}
  />
);

export { Shimmer };
