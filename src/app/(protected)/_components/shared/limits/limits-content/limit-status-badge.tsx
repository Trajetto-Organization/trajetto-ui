import { Badge } from "@/components/ui/badge";

import { cn } from "@/lib/utils";

import type { LimitBadgeTone } from "./lib/vehicle-slots-copy";

/**
 * The state badge of a limits card, one set of colours for every card (they
 * were copied into each branch of each card, six times).
 */
const TONE_CLASSES: Record<LimitBadgeTone, string> = {
  neutral:
    "bg-gray-100 text-gray-700 border-gray-200 dark:bg-muted dark:text-muted-foreground dark:border-border",
  success:
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900",
  warning:
    "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-900",
  danger:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
  notice: "bg-primary/5 text-primary border-primary/20",
};

const LimitStatusBadge = ({
  tone,
  children,
}: {
  tone: LimitBadgeTone;
  children: React.ReactNode;
}): JSX.Element => (
  <Badge
    variant="outline"
    className={cn("shrink-0 truncate", TONE_CLASSES[tone])}
  >
    {children}
  </Badge>
);

export { LimitStatusBadge };
