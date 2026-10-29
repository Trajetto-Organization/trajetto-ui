import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type CaptchaSize = "normal" | "compact" | "flexible";

/**
 * Cloudflare's widget sizes (developers.cloudflare.com/turnstile/…/
 * widget-configurations): normal 300×65, flexible 100% (min. 300)×65,
 * compact 150×140. The box keeps this height free before the widget mounts.
 */
const WIDGET_HEIGHT_PX: Record<CaptchaSize, number> = {
  normal: 65,
  flexible: 65,
  compact: 140,
};

/**
 * The narrowest the widget draws (flexible never goes under 300 px). On a
 * 320 px phone the form is 288 px wide: a box narrower than the widget let
 * the form widen, and shift sideways, when the iframe arrived.
 */
const WIDGET_MIN_WIDTH_PX: Record<CaptchaSize, number> = {
  normal: 300,
  flexible: 300,
  compact: 150,
};

const WIDGET_WIDTH_CLASS: Record<CaptchaSize, string> = {
  normal: "w-[300px] max-w-full",
  flexible: "w-full min-w-[300px]",
  compact: "w-[150px]",
};

interface CaptchaSkeletonProps {
  size?: CaptchaSize;
  className?: string;
}

/**
 * The widget's outline while it loads: the checkbox, the label and the
 * Cloudflare mark, at the widget's exact size. Purely visual (aria-hidden):
 * the captcha's status line says "Carregando…" to screen readers. Also used
 * by the (auth) loading.tsx, so the route fallback reserves the same space.
 */
const CaptchaSkeleton = ({
  size = "normal",
  className,
}: CaptchaSkeletonProps): JSX.Element => {
  const compact = size === "compact";

  return (
    <div
      aria-hidden="true"
      data-captcha-skeleton=""
      className={cn(
        "flex rounded-md border border-border bg-card p-3",
        compact
          ? "flex-col justify-between"
          : "items-center justify-between gap-3 px-4",
        WIDGET_WIDTH_CLASS[size],
        className,
      )}
      style={{ height: WIDGET_HEIGHT_PX[size] }}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="size-6 shrink-0 rounded motion-reduce:animate-none" />
        <Skeleton className="h-3 w-20 motion-reduce:animate-none" />
      </div>
      <div
        className={cn(
          "flex flex-col gap-1.5",
          compact ? "items-start" : "items-end",
        )}
      >
        <Skeleton className="h-3 w-16 motion-reduce:animate-none" />
        <Skeleton className="h-2 w-12 motion-reduce:animate-none" />
      </div>
    </div>
  );
};

export { CaptchaSkeleton, WIDGET_HEIGHT_PX, WIDGET_MIN_WIDTH_PX };
export type { CaptchaSize };
