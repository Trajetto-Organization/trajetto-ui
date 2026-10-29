"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

import Link from "next/link";

import { cn } from "@/lib/utils";

import { LEGAL_DOC_ICONS, LEGAL_DOC_SHORT } from "../legal-docs";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

// The tab the reader came from, so the pill can slide from it: each
// document is its own page, and the new page mounts a new switcher.
const FROM_KEY = "trajetto-legal-switch-from";

interface LegalSwitcherProps {
  documents: { slug: string; label: string }[];
  current: string;
}

/**
 * Termos · Privacidade · Cookies, the design's segmented control. Each tab
 * is a real link to its page (prerendered, works without JavaScript); the
 * white pill sits under the current one and, after a switch, slides there
 * from the previous tab.
 */
const LegalSwitcher = ({ documents, current }: LegalSwitcherProps) => {
  const pillRef = useRef<HTMLSpanElement>(null);
  const index = Math.max(
    0,
    documents.findIndex((doc) => doc.slug === current),
  );

  useIsomorphicLayoutEffect(() => {
    const pill = pillRef.current;
    if (!pill) return;

    let from: number | null = null;
    try {
      const stored = sessionStorage.getItem(FROM_KEY);
      sessionStorage.removeItem(FROM_KEY);
      if (stored !== null) from = Number(stored);
    } catch {
      // Storage blocked: no slide, the pill is already in place.
    }

    if (from === null || from === index || Number.isNaN(from)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Jump to the old tab without a transition, then let it slide.
    pill.style.transition = "none";
    pill.style.transform = `translateX(${from * 100}%)`;
    void pill.offsetWidth;
    pill.style.transition = "";
    pill.style.transform = "";
  }, [index]);

  const remember = () => {
    try {
      sessionStorage.setItem(FROM_KEY, String(index));
    } catch {
      // Ignored: the slide is decoration.
    }
  };

  return (
    <nav
      aria-label="Documentos legais"
      className="relative grid max-w-full animate-[tpUp_.7s_cubic-bezier(.22,1,.36,1)_both] grid-cols-3 self-start rounded-[15px] border border-site-line bg-site-soft2 p-1"
    >
      <span
        ref={pillRef}
        aria-hidden
        className={cn(
          "absolute bottom-1 left-1 top-1 w-[calc((100%-8px)/3)] rounded-[11px] bg-site-surface shadow-[0_1px_2px_rgba(14,14,30,.08),0_6px_16px_-8px_rgba(14,14,30,.25)] transition-transform duration-500 ease-site",
          index === 1 && "translate-x-full",
          index === 2 && "translate-x-[200%]",
        )}
      />
      {documents.map((doc, position) => {
        const active = position === index;
        const Icon = LEGAL_DOC_ICONS[doc.slug];

        return (
          <Link
            key={doc.slug}
            href={`/legal/${doc.slug}`}
            aria-current={active ? "page" : undefined}
            aria-label={doc.label}
            onClick={active ? undefined : remember}
            scroll
            className={cn(
              "relative flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-[11px] px-[clamp(8px,2vw,18px)] py-2.5 text-[13px] font-medium min-[360px]:text-sm outline-none transition-colors duration-300",
              "focus-visible:ring-2 focus-visible:ring-site-ink/40",
              active ? "text-site-ink" : "text-site-muted hover:text-site-ink",
            )}
          >
            {Icon ? (
              <Icon
                aria-hidden
                className="size-[15px] shrink-0 max-[359px]:hidden"
              />
            ) : null}
            {LEGAL_DOC_SHORT[doc.slug] ?? doc.label}
          </Link>
        );
      })}
    </nav>
  );
};

export { LegalSwitcher };
