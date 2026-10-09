"use client";

import { useEffect, useState, type MouseEvent } from "react";

import type { TocItem } from "@/lib/content/types";
import { cn } from "@/lib/utils";

/**
 * "Nesta página": the page's sections with scroll-spy. The active entry is
 * the last heading above the top third of the viewport, measured at most
 * once per frame.
 */
const DocsToc = ({ items }: { items: TocItem[] }) => {
  const [activeId, setActiveId] = useState<string | undefined>(items[0]?.id);

  useEffect(() => {
    const headings = items
      .map((item) => document.getElementById(item.id))
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

      setActiveId(current);
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
  }, [items]);

  const onNavigate = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);
    if (!target) return;

    event.preventDefault();

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    history.replaceState(history.state, "", `#${id}`);
    setActiveId(id);
  };

  if (items.length === 0) return null;

  return (
    <nav aria-label="Nesta página" className="text-sm">
      <p className="mb-3 font-site-mono text-[11.5px] font-medium tracking-[.14em] text-site-muted">
        NESTA PÁGINA
      </p>

      <ol className="space-y-0.5 border-l-2 border-site-line">
        {items.map((item) => {
          const active = item.id === activeId;

          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={(event) => onNavigate(event, item.id)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "-ml-0.5 block rounded-r-[6px] border-l-2 py-1 leading-snug outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-site-ink/40",
                  item.level === 3 ? "pl-6 text-[13px]" : "pl-4",
                  active
                    ? "border-site-pink font-medium text-site-ink"
                    : "border-transparent text-site-muted hover:border-site-line2 hover:text-site-ink",
                )}
              >
                {item.text}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export { DocsToc };
