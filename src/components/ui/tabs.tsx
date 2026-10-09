"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";
import {
  SCROLL_RAIL_CLASS,
  ScrollEdgeControls,
  useScrollRail,
} from "@/components/ui/scrollable-tabs";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

interface ScrollableTabsListProps extends React.ComponentPropsWithoutRef<
  typeof TabsPrimitive.List
> {
  /** Classes for the positioned wrapper that holds the faded edges. */
  wrapperClassName?: string;
}

/**
 * A TabsList that overflows the way Entregas does (decision 3.1).
 *
 * The plain list plus `overflow-x-auto` is what /admin and /dashboard had:
 * setting `overflow-x` also turns `overflow-y` into `auto`, the Windows
 * scrollbar is drawn inside the fixed 40px box, and the tabs came out with a
 * horizontal AND a vertical bar. Here the list itself is the rail — native bar
 * hidden, vertical overflow clipped, arrows over faded edges — so Radix keeps
 * its `role="tablist"`, arrow-key focus and `data-state` on the triggers, and
 * any `data-tutorial` passed in stays on the list.
 */
const ScrollableTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  ScrollableTabsListProps
>(({ className, wrapperClassName, ...props }, forwardedRef) => {
  const { ref, edges, nudge } = useScrollRail<HTMLDivElement>();

  React.useImperativeHandle(forwardedRef, () => ref.current as HTMLDivElement);

  return (
    <div
      data-scroll-rail
      className={cn("relative w-fit min-w-0 max-w-full", wrapperClassName)}
    >
      <TabsPrimitive.List
        ref={ref}
        className={cn(
          "flex h-10 w-full max-w-full items-center rounded-md bg-muted p-1 text-muted-foreground",
          className,
          // After the caller's classes: a `justify-center` would clip the
          // first tab where no scroll can reach it, and a wrap is the second
          // line this rail exists to avoid.
          "flex-nowrap justify-start",
          SCROLL_RAIL_CLASS,
        )}
        {...props}
      />

      <ScrollEdgeControls edges={edges} onNudge={nudge} tone="muted" />
    </div>
  );
});
ScrollableTabsList.displayName = "ScrollableTabsList";

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, ScrollableTabsList, TabsTrigger, TabsContent };
