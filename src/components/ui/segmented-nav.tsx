"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
 *
 * **Two compositions, not one that stretches.** Entregas has ten sections,
 * which want 1431px; a phone offers 360. The strip used to keep the browser's
 * own scrollbar, which on Windows is a grey slab drawn INSIDE the 40px box —
 * eating enough of it that a vertical scrollbar appeared as well, complete
 * with little arrows, on a row of tabs. Below `md` the sections are a menu
 * naming the one you are on; from `md` up they are the strip, scrolled with
 * the product's own controls rather than the operating system's.
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

/** How much of the strip is off-screen, on each side. */
interface ScrollEdges {
  left: boolean;
  right: boolean;
}

function useScrollEdges(): [
  React.RefObject<HTMLUListElement>,
  ScrollEdges,
  (direction: -1 | 1) => void,
] {
  const ref = useRef<HTMLUListElement>(null);

  const [edges, setEdges] = useState<ScrollEdges>({
    left: false,
    right: false,
  });

  const measure = useCallback(() => {
    const element = ref.current;

    if (!element) return;

    // One pixel of slack: fractional widths make `scrollLeft` land at
    // 0.5 from either end and the arrows flicker forever.
    setEdges({
      left: element.scrollLeft > 1,
      right:
        element.scrollLeft + element.clientWidth < element.scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    measure();

    element.addEventListener("scroll", measure, { passive: true });

    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => {
      element.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [measure]);

  const nudge = useCallback((direction: -1 | 1) => {
    const element = ref.current;

    if (!element) return;

    element.scrollBy({
      left: direction * Math.max(160, element.clientWidth * 0.6),
      behavior: "smooth",
    });
  }, []);

  return [ref, edges, nudge];
}

const SegmentedNav = ({
  items,
  activeValue,
  hrefFor,
  label,
  className,
  dataTutorial,
}: SegmentedNavProps): JSX.Element => {
  const [scroller, edges, nudge] = useScrollEdges();

  const active = items.find((item) => item.value === activeValue) ?? items[0];

  /**
   * The section you are on, brought into view.
   *
   * Opening Importações from a link used to land on a strip scrolled to the
   * start, with the active tab somewhere off to the right — the one thing the
   * strip exists to show. Moved by `scrollLeft` rather than `scrollIntoView`,
   * which would also scroll the page to reach it.
   */
  useEffect(() => {
    const element = scroller.current;

    if (!element) return;

    const current = element.querySelector<HTMLElement>('[aria-current="page"]');

    if (!current) return;

    const target =
      current.offsetLeft - (element.clientWidth - current.offsetWidth) / 2;

    element.scrollLeft = Math.max(0, target);
  }, [activeValue, scroller]);

  const ActiveIcon = active?.icon;

  return (
    <>
      {/*
        Phones. A menu rather than a squeezed strip: ten sections cannot be
        shown at 360px by any arrangement, so the honest thing is to name the
        one you are on and open the rest on demand.
      */}
      <nav
        aria-label={label}
        className={cn("w-full min-w-0 md:hidden", className)}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {/*
              The rail with one segment showing, not a select.

              A bordered white control is what the COMPANY selector is, and on
              /admin the two sat one above the other: same height, same border,
              same chevron, one saying "business test" and one saying
              "Entregas". Two different questions wearing the same answer.
              Built out of the desk strip's own parts instead — the muted
              track, the chosen section lifted out of it — so the phone shows
              a smaller version of the same thing rather than a different one.
            */}
            <button
              type="button"
              data-tutorial={dataTutorial}
              className="flex h-10 w-full items-center gap-2 rounded-md
              bg-muted p-1 text-sm font-medium ring-offset-background
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span
                className="flex h-8 min-w-0 flex-1 items-center gap-2
                rounded-sm bg-background px-3 text-foreground shadow-sm"
              >
                {ActiveIcon ? (
                  <ActiveIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                ) : null}
                <span className="truncate">{active?.label}</span>
                {active?.badge}
              </span>

              <ChevronDown
                className="mr-2 h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </button>
          </DropdownMenuTrigger>

          {/* As wide as the trigger: a menu narrower than the control that
              opened it reads as a different control. */}
          <DropdownMenuContent
            align="start"
            className="w-[var(--radix-dropdown-menu-trigger-width)]"
          >
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = item.value === activeValue;

              return (
                <DropdownMenuItem key={item.value} asChild>
                  <Link
                    href={hrefFor(item.value)}
                    aria-current={isActive ? "page" : undefined}
                    className="flex cursor-pointer items-center gap-2"
                  >
                    {Icon ? (
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    ) : null}
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge}
                    {isActive && (
                      <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                    )}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>

      {/* Tablets and desktops. */}
      <nav
        aria-label={label}
        /**
         * `min-w-0` + `max-w-full` is what makes the list's `overflow-x-auto`
         * work at all. With a `lg:w-auto` that used to be here, from 1024px up
         * the strip sized itself to its content — 1431px inside a 768px area —
         * and the scroll container never had anything left to scroll, so the
         * trailing items sat off-screen and unreachable.
         *
         * That `lg:w-auto` is also why a 1920px desk showed a rail that
         * stopped short with a strip of empty page beside it: content-width on
         * a screen wide enough to hold the content. The rail is the page's
         * width at every size now, and the items divide it.
         */
        className={cn(
          "relative hidden w-full min-w-0 max-w-full md:block",
          className,
        )}
      >
        <ul
          ref={scroller}
          data-tutorial={dataTutorial}
          className="scrollbar-none flex h-10 w-full max-w-full
          items-center justify-start overflow-x-auto scroll-smooth rounded-md
          bg-muted p-1 text-muted-foreground"
        >
          {items.map((item) => {
            const isActive = item.value === activeValue;
            const Icon = item.icon;

            return (
              /*
                Grow into whatever the rail has spare — never below the label,
                never past 256px.

                `min-w-max` is the same guarantee the old `shrink-0` gave: an
                item is never squeezed under its own text, so ten sections
                still overflow a 1280px rail and still scroll. What changes is
                the other direction — where the sections DO fit, the leftover
                width is divided between them instead of being left as a gap
                to the right of the last one. `flex-auto` rather than `flex-1`
                so the share is added to each item's natural width, keeping a
                long label longer than a short one.

                The 256px ceiling is what keeps that from becoming its own
                defect. Entregas has ten sections and fills a 1920px rail
                exactly; Integrações has four, and uncapped they came out
                390px wide each — a segmented control stretched until the
                labels float in the middle of nothing. Every label in this
                product is comfortably under 256px, so the cap only ever bites
                where there are few sections and a very wide screen, and there
                what is left over reads as the rail continuing rather than as
                a hole in the page.
              */
              <li key={item.value} className="flex min-w-max max-w-64 flex-auto">
                <Link
                  href={hrefFor(item.value)}
                  // The one the user is on, said out loud rather than only
                  // drawn.
                  aria-current={isActive ? "page" : undefined}
                  data-tutorial={item.dataTutorial}
                  className={cn(
                    `inline-flex w-full items-center justify-center gap-1
                    whitespace-nowrap rounded-sm px-2 py-1.5 text-sm font-medium
                    ring-offset-background transition-all
                    focus-visible:outline-none focus-visible:ring-2
                    focus-visible:ring-ring focus-visible:ring-offset-2
                    sm:px-3`,
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

        {/*
          The scroll controls, shown only where there is something to reach.
          `aria-hidden` because every item is already in the tab order inside
          the list — these move the viewport, they are not a second way to
          navigate, and announcing them would just add two stops to the
          keyboard path.
        */}
        {edges.left && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-1 left-1 flex
            items-center bg-gradient-to-r from-muted via-muted to-transparent
            pr-10"
          >
            <button
              type="button"
              tabIndex={-1}
              className="pointer-events-auto flex h-7 w-7 items-center
              justify-center rounded-sm text-muted-foreground
              hover:bg-background hover:text-foreground"
              onClick={() => nudge(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        )}

        {edges.right && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-1 right-1 flex
            items-center bg-gradient-to-l from-muted via-muted to-transparent
            pl-10"
          >
            <button
              type="button"
              tabIndex={-1}
              className="pointer-events-auto flex h-7 w-7 items-center
              justify-center rounded-sm text-muted-foreground
              hover:bg-background hover:text-foreground"
              onClick={() => nudge(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </nav>
    </>
  );
};

export { SegmentedNav };
export type { SegmentedNavItem };
