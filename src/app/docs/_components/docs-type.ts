/**
 * The portal's type and surfaces on the public site's tokens (decision 16),
 * shared by the guides, the reference and the views that print the API's
 * numbers, so the three read as one page family with the blog and legal.
 */

/** Page title: the site's display face, sized between "md" and "sm". */
const DOCS_TITLE =
  "m-0 font-site-display text-[clamp(32px,4vw,46px)] font-medium leading-[1.06] tracking-[-.03em] text-site-ink [text-wrap:balance]";

/** The lead under a title. */
const DOCS_LEAD =
  "mt-4 text-[clamp(17px,1.5vw,19px)] leading-[1.6] text-site-muted [text-wrap:pretty]";

/** A small heading inside a section ("Parâmetros", "Respostas"). */
const DOCS_SUBTITLE =
  "mb-3 mt-6 font-site-mono text-[11.5px] font-medium uppercase tracking-[.12em] text-site-muted";

/** Inline code, as the editorial prose draws it. */
const DOCS_INLINE_CODE =
  "rounded-md bg-site-soft2 px-[.42em] py-[.12em] font-site-mono text-[.86em] text-site-ink";

/** A link in running text: ink with the accent underline. */
const DOCS_LINK =
  "rounded-[2px] font-medium text-site-ink underline decoration-site-pink decoration-[1.5px] underline-offset-[3px] outline-none transition-colors hover:decoration-site-ink dark:text-site-ink dark:decoration-site-pink dark:hover:decoration-site-ink focus-visible:ring-2 focus-visible:ring-site-ink/40";

/**
 * The frame of a table that scrolls sideways on its own. Render it with
 * tableRegionProps: a region that scrolls must be reachable by keyboard.
 */
const DOCS_TABLE_FRAME =
  "overflow-x-auto rounded-2xl border border-site-line bg-site-surface outline-none focus-visible:ring-2 focus-visible:ring-site-ink/40";

/**
 * A table frame scrolls on a phone (the tables keep a minimum width): a
 * named, focusable region, or the keyboard cannot scroll it (WCAG 2.1.1,
 * axe scrollable-region-focusable).
 */
function tableRegionProps(label: string) {
  return { role: "region", "aria-label": label, tabIndex: 0 } as const;
}

const DOCS_TABLE =
  "w-full border-collapse text-left text-[14.5px] leading-[1.55]";

const DOCS_TH =
  "whitespace-nowrap border-b border-site-line bg-site-soft px-4 py-3 text-left text-[12.5px] font-semibold text-site-muted";

/** Body cells: the design's ink2 (#2a2b33 / #d4d5dc), like the prose. */
const DOCS_TD =
  "border-t border-site-line px-4 py-[13px] align-top text-[#2a2b33] dark:text-[#d4d5dc]";

/** A bordered card on the page (endpoints, the base address). */
const DOCS_CARD = "rounded-[18px] border border-site-line bg-site-surface";

export {
  DOCS_CARD,
  DOCS_INLINE_CODE,
  DOCS_LEAD,
  DOCS_LINK,
  DOCS_SUBTITLE,
  DOCS_TABLE,
  DOCS_TABLE_FRAME,
  DOCS_TD,
  DOCS_TH,
  DOCS_TITLE,
  tableRegionProps,
};
