"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type HTMLAttributes,
  type RefObject,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The one way a strip of tabs or filter chips overflows in this product.
 *
 * Extracted from Entregas' section rail, which the user named as the
 * reference: when the strip is wider than the screen it keeps ONE line, hides
 * the operating system's scrollbar (on Windows it is a 15px slab drawn inside
 * the 40px box, which is what gave /admin a horizontal AND a vertical bar on
 * a row of tabs), and shows a faded edge with an arrow on each side that still
 * hides something.
 *
 * Three consumers, three different elements doing the scrolling — a `<ul>` of
 * links (SegmentedNav), Radix's `role="tablist"` (ScrollableTabsList) and a
 * `role="group"` of toggles (FilterChips) — so the behaviour is a hook plus
 * an overlay, and `ScrollableTabs` is only the plain-`div` convenience.
 */
interface ScrollEdges {
  left: boolean;
  right: boolean;
}

interface ScrollMetrics {
  scrollLeft: number;
  clientWidth: number;
  scrollWidth: number;
}

/**
 * Which sides still hide content.
 *
 * One pixel of slack: fractional widths make `scrollLeft` settle 0.5px from
 * either end and the arrows would flicker forever.
 */
function readScrollEdges({
  scrollLeft,
  clientWidth,
  scrollWidth,
}: ScrollMetrics): ScrollEdges {
  return {
    left: scrollLeft > 1,
    right: scrollLeft + clientWidth < scrollWidth - 1,
  };
}

/** How far one arrow press moves: most of a screen, never a crawl. */
function scrollStep(clientWidth: number): number {
  return Math.max(160, Math.round(clientWidth * 0.6));
}

/**
 * The `scrollLeft` that puts an item in the middle of the rail.
 *
 * Positions come from bounding boxes rather than `offsetLeft`, which is
 * relative to whatever ancestor happens to be positioned — the rail is not
 * always that ancestor.
 */
function centeredScrollLeft(
  rail: { scrollLeft: number; clientWidth: number; left: number },
  item: { left: number; width: number },
): number {
  const itemStart = rail.scrollLeft + (item.left - rail.left);

  return Math.max(0, itemStart - (rail.clientWidth - item.width) / 2);
}

/** What makes an item "the one you are on", across the three consumers. */
const ACTIVE_SELECTOR =
  '[aria-current="page"], [data-state="active"], [aria-pressed="true"]';

interface ScrollRail<T extends HTMLElement> {
  ref: RefObject<T>;
  edges: ScrollEdges;
  nudge: (direction: -1 | 1) => void;
}

/**
 * Measures the rail, keeps the active item in view and moves on demand.
 *
 * The active item is re-centred whenever a DIFFERENT element becomes active —
 * a link's `aria-current` after navigation, a Radix trigger's `data-state`
 * after a click, a chip's `aria-pressed` — so opening Importações from a link
 * no longer lands on a strip scrolled to the start with the active section
 * off to the right. `scrollLeft` rather than `scrollIntoView`, which would
 * also scroll the page to reach it.
 */
function useScrollRail<T extends HTMLElement>(): ScrollRail<T> {
  const ref = useRef<T>(null);
  const lastActive = useRef<Element | null>(null);

  const [edges, setEdges] = useState<ScrollEdges>({
    left: false,
    right: false,
  });

  const measure = useCallback(() => {
    const element = ref.current;

    if (!element) return;

    const next = readScrollEdges(element);

    // Same answer, same object: a scroll event per frame must not re-render
    // the strip per frame.
    setEdges((previous) =>
      previous.left === next.left && previous.right === next.right
        ? previous
        : next,
    );
  }, []);

  const centerActive = useCallback(() => {
    const element = ref.current;

    if (!element) return;

    const active = element.querySelector(ACTIVE_SELECTOR);

    if (!active || active === lastActive.current) return;

    lastActive.current = active;

    const railBox = element.getBoundingClientRect();
    const itemBox = active.getBoundingClientRect();

    element.scrollLeft = centeredScrollLeft(
      {
        scrollLeft: element.scrollLeft,
        clientWidth: element.clientWidth,
        left: railBox.left,
      },
      { left: itemBox.left, width: itemBox.width },
    );
  }, []);

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    measure();
    centerActive();

    element.addEventListener("scroll", measure, { passive: true });

    // The rail's own box AND its items: a counter growing from 9 to 10
    // widens a chip without the rail itself changing size.
    const resize = new ResizeObserver(measure);
    resize.observe(element);
    Array.from(element.children).forEach((child) => resize.observe(child));

    const mutations = new MutationObserver(() => {
      Array.from(element.children).forEach((child) => resize.observe(child));
      measure();
      centerActive();
    });

    mutations.observe(element, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-current", "data-state", "aria-pressed"],
    });

    return () => {
      element.removeEventListener("scroll", measure);
      resize.disconnect();
      mutations.disconnect();
    };
  }, [measure, centerActive]);

  const nudge = useCallback((direction: -1 | 1) => {
    const element = ref.current;

    if (!element) return;

    element.scrollBy({
      left: direction * scrollStep(element.clientWidth),
      behavior: "smooth",
    });
  }, []);

  return { ref, edges, nudge };
}

/**
 * Classes for the element that scrolls. `scroll-px-10` keeps an item reached
 * by keyboard clear of the faded edge instead of stopping underneath it.
 */
const SCROLL_RAIL_CLASS =
  "scrollbar-none overflow-x-auto overflow-y-hidden scroll-smooth scroll-px-10";

type ScrollTone = "muted" | "background";

const FADE_CLASS: Record<ScrollTone, { left: string; right: string }> = {
  muted: {
    left: "bg-gradient-to-r from-muted via-muted to-transparent",
    right: "bg-gradient-to-l from-muted via-muted to-transparent",
  },
  background: {
    left: "bg-gradient-to-r from-background via-background to-transparent",
    right: "bg-gradient-to-l from-background via-background to-transparent",
  },
};

interface ScrollEdgeControlsProps {
  edges: ScrollEdges;
  onNudge: (direction: -1 | 1) => void;

  /** The rail's own background, so the fade reads as the rail continuing. */
  tone?: ScrollTone;
}

/**
 * The faded edges and their arrows, shown only where something is hidden.
 *
 * `aria-hidden` and out of the tab order because every item is already in
 * it: these move the viewport, they are not a second way to reach an item,
 * and announcing them would add two stops to the keyboard path.
 *
 * Flush with the rail's edge (`left-0`/`right-0`), the arrow kept off it by
 * padding: the rail's own `p-1` is part of its scrollport, so an overlay inset
 * by 4px left a sliver where the next label showed past the arrow.
 */
const ScrollEdgeControls = ({
  edges,
  onNudge,
  tone = "muted",
}: ScrollEdgeControlsProps): JSX.Element => (
  <>
    {edges.left && (
      <div
        aria-hidden="true"
        data-scroll-edge="left"
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 flex items-center rounded-l-md pl-1 pr-10",
          FADE_CLASS[tone].left,
        )}
      >
        <button
          type="button"
          tabIndex={-1}
          className="pointer-events-auto flex h-7 w-7 items-center
          justify-center rounded-sm text-muted-foreground
          hover:bg-background hover:text-foreground"
          onClick={() => onNudge(-1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
    )}

    {edges.right && (
      <div
        aria-hidden="true"
        data-scroll-edge="right"
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 flex items-center rounded-r-md pl-10 pr-1",
          FADE_CLASS[tone].right,
        )}
      >
        <button
          type="button"
          tabIndex={-1}
          className="pointer-events-auto flex h-7 w-7 items-center
          justify-center rounded-sm text-muted-foreground
          hover:bg-background hover:text-foreground"
          onClick={() => onNudge(1)}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    )}
  </>
);

interface ScrollableTabsProps extends HTMLAttributes<HTMLDivElement> {
  tone?: ScrollTone;

  /**
   * Classes for the positioned wrapper. It hugs its content by default and
   * never exceeds its parent — pass `w-full` for a rail that spans the row.
   */
  wrapperClassName?: string;
}

/**
 * A single-line strip in a plain `div`: role, label and styling go to the
 * element that scrolls, the arrows sit over it.
 */
const ScrollableTabs = forwardRef<HTMLDivElement, ScrollableTabsProps>(
  (
    { tone = "muted", wrapperClassName, className, children, ...props },
    forwardedRef,
  ) => {
    const { ref, edges, nudge } = useScrollRail<HTMLDivElement>();

    useImperativeHandle(forwardedRef, () => ref.current as HTMLDivElement);

    return (
      <div
        data-scroll-rail
        className={cn("relative w-fit min-w-0 max-w-full", wrapperClassName)}
      >
        <div
          ref={ref}
          className={cn(
            "flex w-full",
            className,
            "flex-nowrap",
            SCROLL_RAIL_CLASS,
          )}
          {...props}
        >
          {children}
        </div>

        <ScrollEdgeControls edges={edges} onNudge={nudge} tone={tone} />
      </div>
    );
  },
);
ScrollableTabs.displayName = "ScrollableTabs";

export {
  ScrollableTabs,
  ScrollEdgeControls,
  useScrollRail,
  readScrollEdges,
  scrollStep,
  centeredScrollLeft,
  SCROLL_RAIL_CLASS,
};
export type { ScrollEdges, ScrollTone };
