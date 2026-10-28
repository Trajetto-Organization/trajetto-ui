"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Check, ChevronDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SCROLL_RAIL_CLASS,
  ScrollEdgeControls,
  useScrollRail,
} from "@/components/ui/scrollable-tabs";

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

  /**
   * Whether the rail spans the page or hugs its sections.
   *
   * Ten sections and four sections are not the same control. Entregas fills
   * the width because its sections nearly do anyway — left to hug, the rail
   * stopped 120px short of a 1920px page with bare background beside it.
   * Integrações has four, and filling stretched each one to 390px: a
   * segmented control pulled until the labels float in the middle of nothing.
   *
   * So it is the caller's call, because only the caller knows how many
   * sections it has. Filling is the default because that is what the screen
   * with ten wanted; `false` keeps the rail at its content's width. Either way
   * it scrolls on one line with the faded edges and arrows when the page is
   * narrower than the sections — never a second line (decision 3.1).
   */
  fill?: boolean;

  className?: string;
  dataTutorial?: string;
}

/**
 * The tutorial anchor of the PHONE variant of an anchor.
 *
 * Both variants are always in the DOM and one is `display: none`: the phone
 * menu below `md`, the desk strip from `md` up. Sharing one name made a tour
 * looking up "deliveries-tabs" find the hidden one first (a 0x0 box) and aim
 * its spotlight at the corner. So the desk strip and its links keep
 * `<anchor>`, the phone trigger and its menu items carry `<anchor>-mobile`,
 * and a tour resolves a step by taking whichever of the two is visible.
 */
const mobileTutorialAnchor = (anchor?: string): string | undefined =>
  anchor ? `${anchor}-mobile` : undefined;

/**
 * The sections are never prefetched.
 *
 * Every section here is the same page with another query (`?tab=`,
 * `?view=`). In Next 14 without PPR, the automatic prefetch of such a link
 * renders the whole page on the server — the loading.tsx cut-off only
 * applies BELOW a segment, and the render starts at the page segment
 * itself — so drawing Entregas' strip rendered every tab with its data, one
 * server render and a list read per section the person never opened (24 API
 * calls to open one tab). A click now asks for the section it names, and
 * the page's loading.tsx/Suspense skeleton covers the wait.
 */
const SECTION_PREFETCH = false;

const SegmentedNav = ({
  items,
  activeValue,
  hrefFor,
  label,
  fill = true,
  className,
  dataTutorial,
}: SegmentedNavProps): JSX.Element => {
  // Keeps the section you are on in view, and measures the faded edges.
  const { ref: scroller, edges, nudge } = useScrollRail<HTMLUListElement>();

  const active = items.find((item) => item.value === activeValue) ?? items[0];

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

              Its own tutorial anchor (`-mobile`), never the desk strip's: this
              button comes FIRST in the DOM and is `display: none` from `md`
              up, so sharing the name made a tour looking up "deliveries-tabs"
              find a 0x0 box and point its spotlight at the corner.
            */}
            <button
              type="button"
              data-tutorial={mobileTutorialAnchor(dataTutorial)}
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
                    prefetch={SECTION_PREFETCH}
                    aria-current={isActive ? "page" : undefined}
                    data-tutorial={mobileTutorialAnchor(item.dataTutorial)}
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
          "relative hidden min-w-0 max-w-full md:block",

          /*
            `w-fit` and not `w-auto`: the nav is a block, and `width: auto` on
            a block is 100% of its parent — it would report the full page width
            while the rail inside it hugged, which is also how an earlier
            version of this file survived a test that measured the wrong box.
          */
          fill ? "w-full" : "w-fit",

          className,
        )}
      >
        <ul
          ref={scroller}
          data-tutorial={dataTutorial}
          className={cn(
            `flex h-10 w-full max-w-full items-center justify-start
            rounded-md bg-muted p-1 text-muted-foreground`,

            /*
              One line, always. A hugging rail used to wrap onto a second line
              instead (Integrações at 768px with the sidebar open), and the
              user asked for exactly the opposite: the same faded edge and
              arrows Entregas has. The rail stays 40px tall and scrolls.
            */
            SCROLL_RAIL_CLASS,
          )}
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
              <li
                key={item.value}
                className={cn("flex min-w-max", fill && "max-w-64 flex-auto")}
              >
                <Link
                  href={hrefFor(item.value)}
                  prefetch={SECTION_PREFETCH}
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
                  {Icon ? (
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  ) : null}
                  <span>{item.label}</span>
                  {item.badge}
                </Link>
              </li>
            );
          })}
        </ul>

        <ScrollEdgeControls edges={edges} onNudge={nudge} tone="muted" />
      </nav>
    </>
  );
};

export { SegmentedNav, mobileTutorialAnchor };
export type { SegmentedNavItem };
