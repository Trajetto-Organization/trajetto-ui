"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A tab strip that is honest about being navigation.
 *
 * Radix `Tabs` was being used for screens whose panels are separate server
 * renders keyed off a URL parameter — there was never a `TabsContent` to go
 * with the triggers. So `aria-controls` pointed at an id that never existed,
 * and `role="tab"` promised a screen-reader user a tab panel they would never
 * reach and arrow-key movement between panels that are in fact page loads.
 *
 * These are links. They change the URL, they open in a new tab on a middle
 * click, they can be copied from the context menu — and now they say so.
 */
interface SegmentedNavItem {
  value: string;
  label: string;
  icon?: LucideIcon;
  /** Rendered after the label, for counters and accents. */
  badge?: ReactNode;
  dataTutorial?: string;
}

interface SegmentedNavProps {
  items: readonly SegmentedNavItem[];
  activeValue: string;
  /** The URL each item points at, built by the caller from its own params. */
  hrefFor: (value: string) => string;
  /** Accessible name for the <nav>, since a page may hold more than one. */
  label: string;
  className?: string;
  dataTutorial?: string;
}

const SegmentedNav = ({
  items,
  activeValue,
  hrefFor,
  label,
  className,
  dataTutorial,
}: SegmentedNavProps): JSX.Element => (
  <nav
    aria-label={label}
    /**
     * `min-w-0` + `max-w-full` is what makes the list's `overflow-x-auto`
     * work at all. With only `lg:w-auto`, from 1024px up the strip sized
     * itself to its content — 1431px inside a 768px area — and the scroll
     * container never had anything left to scroll, so the trailing items sat
     * off-screen and unreachable.
     */
    className={cn("w-full min-w-0 max-w-full lg:w-auto", className)}
  >
    <ul
      data-tutorial={dataTutorial}
      className="inline-flex h-10 w-full max-w-full items-center
      justify-start overflow-x-auto rounded-md bg-muted p-1
      text-muted-foreground lg:w-auto"
    >
      {items.map((item) => {
        const isActive = item.value === activeValue;
        const Icon = item.icon;

        return (
          <li key={item.value} className="flex flex-1 lg:flex-initial">
            <Link
              href={hrefFor(item.value)}
              // The one the user is on, said out loud rather than only drawn.
              aria-current={isActive ? "page" : undefined}
              data-tutorial={item.dataTutorial}
              className={cn(
                `inline-flex w-full items-center justify-center gap-1
                whitespace-nowrap rounded-sm px-2 py-1.5 text-sm font-medium
                ring-offset-background transition-all focus-visible:outline-none
                focus-visible:ring-2 focus-visible:ring-ring
                focus-visible:ring-offset-2 sm:px-3`,
                isActive && "bg-background text-foreground shadow-sm",
              )}
            >
              {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
              <span>{item.label}</span>
              {item.badge}
            </Link>
          </li>
        );
      })}
    </ul>
  </nav>
);

export { SegmentedNav };
export type { SegmentedNavItem };
