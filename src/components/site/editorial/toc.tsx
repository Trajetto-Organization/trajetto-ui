"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";

import type { TocItem } from "@/lib/content/types";
import { cn } from "@/lib/utils";

import { ReadingPercent } from "./reading-progress";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Room above a heading the TOC scrolls to: the fixed header plus air. */
const SCROLL_OFFSET = 100;

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Scroll-spy over the headings: the active one is the last whose top is
 * above 30% of the viewport (the design's rule), measured once per frame.
 */
function useActiveHeading(ids: string[]): [string, (id: string) => void] {
  const [active, setActive] = useState(ids[0] ?? "");

  useEffect(() => {
    const headings = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);

    if (headings.length === 0) return;

    let frame = 0;

    const update = () => {
      frame = 0;
      const threshold = window.innerHeight * 0.3;
      let current = headings[0].id;

      for (const heading of headings) {
        if (heading.getBoundingClientRect().top > threshold) break;
        current = heading.id;
      }

      setActive(current);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [ids]);

  return [active, setActive];
}

function scrollToId(
  event: MouseEvent<HTMLAnchorElement>,
  id: string,
  offset = SCROLL_OFFSET,
): boolean {
  const target = document.getElementById(id);
  if (!target) return false;

  event.preventDefault();
  window.scrollTo({
    top: target.getBoundingClientRect().top + window.scrollY - offset,
    behavior: reducedMotion() ? "auto" : "smooth",
  });
  history.replaceState(history.state, "", `#${encodeURIComponent(id)}`);

  return true;
}

interface EditorialTocProps {
  items: TocItem[];
  /**
   * "article": h2 and h3, the category's accent, "↑ Voltar ao topo".
   * "legal": numbered h2 clauses ("01 Aceite e partes"), ink, reading %.
   */
  variant: "article" | "legal";
  /** The prose element, for the legal variant's percentage. */
  targetId?: string;
  className?: string;
}

/** Splits "1. Aceite e partes" into "01" and "Aceite e partes". */
function clause(text: string): { number: string; label: string } {
  const match = /^(\d+)\.\s*(.*)$/.exec(text);

  return match
    ? { number: match[1].padStart(2, "0"), label: match[2] }
    : { number: "", label: text };
}

/**
 * The sticky index of the article and legal pages, with the bar that slides
 * to the current section. Server-rendered as plain anchors, so it works as
 * a list of links before (or without) hydration.
 */
const EditorialToc = ({
  items,
  variant,
  targetId,
  className,
}: EditorialTocProps) => {
  const ids = useRef(items.map((item) => item.id)).current;
  const [active, setActive] = useActiveHeading(ids);

  const listRef = useRef<HTMLOListElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);

  // Moves the bar onto the active entry (offsetTop inside the list).
  useIsomorphicLayoutEffect(() => {
    const list = listRef.current;
    const bar = barRef.current;
    if (!list || !bar) return;

    const li = list.querySelector<HTMLElement>(
      `[data-toc-item="${CSS.escape(active)}"]`,
    );
    if (!li) return;

    bar.style.transform = `translateY(${li.offsetTop}px)`;
    bar.style.height = `${li.offsetHeight}px`;
    bar.style.opacity = "1";
  }, [active]);

  const legal = variant === "legal";

  return (
    <nav
      aria-label={legal ? "Seções" : "Neste artigo"}
      className={cn(
        "sticky top-[110px] flex max-h-[calc(100vh-140px)] flex-col overflow-auto overscroll-contain pr-1.5",
        legal ? "gap-3" : "gap-3.5",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2.5">
        <p className="m-0 font-site-mono text-[11.5px] tracking-[.14em] text-site-muted">
          {legal ? "SEÇÕES" : "NESTE ARTIGO"}
        </p>
        {legal && targetId ? (
          <ReadingPercent
            targetId={targetId}
            className="font-site-mono text-[11.5px] text-site-muted"
          />
        ) : null}
      </div>

      <ol
        ref={listRef}
        className={cn(
          "relative m-0 flex list-none flex-col py-0 pl-4 pr-0",
          !legal && "gap-0.5",
        )}
      >
        <span
          aria-hidden
          className="absolute bottom-1 left-0 top-1 w-0.5 rounded-sm bg-site-line"
        />
        <span
          ref={barRef}
          aria-hidden
          className={cn(
            "absolute left-0 top-0 h-7 w-0.5 rounded-sm opacity-0 transition-[transform,height] [transition-duration:450ms] ease-site",
            legal ? "bg-site-ink" : "bg-[rgb(var(--acc))]",
          )}
        />
        {items.map((item) => {
          const current = item.id === active;
          const { number, label } = legal
            ? clause(item.text)
            : { number: "", label: item.text };

          return (
            <li key={item.id} data-toc-item={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={current ? "location" : undefined}
                onClick={(event) => {
                  if (scrollToId(event, item.id, legal ? 96 : SCROLL_OFFSET))
                    setActive(item.id);
                }}
                className={cn(
                  "rounded-sm transition-colors duration-300 hover:text-site-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-site-ink/40",
                  current ? "font-semibold text-site-ink" : "text-site-muted",
                  legal
                    ? "flex gap-2.5 py-1.5 text-[13.5px] leading-[1.4]"
                    : cn(
                        "block py-1.5 leading-[1.45]",
                        item.level === 3 ? "pl-3.5 text-[13px]" : "text-sm",
                      ),
                )}
              >
                {legal ? (
                  <>
                    <span
                      aria-hidden
                      className="w-5 shrink-0 pt-px font-site-mono text-[11.5px]"
                    >
                      {number}
                    </span>
                    <span>{label}</span>
                  </>
                ) : (
                  label
                )}
              </a>
            </li>
          );
        })}
      </ol>

      {legal ? null : (
        <a
          href="#topo"
          onClick={(event) => {
            event.preventDefault();
            window.scrollTo({
              top: 0,
              behavior: reducedMotion() ? "auto" : "smooth",
            });
          }}
          className="mt-1.5 inline-flex items-center gap-1.5 self-start rounded-sm text-[13px] text-site-muted hover:text-site-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-site-ink/40"
        >
          ↑ Voltar ao topo
        </a>
      )}
    </nav>
  );
};

export { EditorialToc };
