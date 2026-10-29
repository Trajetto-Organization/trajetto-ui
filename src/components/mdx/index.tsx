import type { ComponentPropsWithoutRef } from "react";

import { blogProseComponents } from "@/components/site/editorial/prose";

import type { MdxComponents } from "@/lib/content/mdx";
import {
  TABLE_LABEL_PROP,
  tableRegionLabel,
  type TableProps,
} from "@/lib/content/table-label";

import { MdxLink } from "./mdx-link";

/**
 * Markdown elements on theme tokens, so the dark theme (the default follows
 * the system) needs no second set of colors. The docs portal builds on
 * these; the blog and the legal pages use the editorial prose of the site
 * redesign instead (components/site/editorial/prose).
 */

type Props<T extends keyof JSX.IntrinsicElements> = ComponentPropsWithoutRef<T>;

const baseMdxComponents: MdxComponents = {
  p: (props: Props<"p">) => (
    <p
      className="mb-5 text-[15px] leading-[1.8] text-muted-foreground sm:text-base"
      {...props}
    />
  ),
  h2: ({ children, ...props }: Props<"h2">) => (
    <h2
      className="mb-4 mt-12 scroll-mt-24 text-2xl font-bold tracking-tight text-foreground sm:text-[1.7rem]"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: Props<"h3">) => (
    <h3
      className="mb-3 mt-8 scroll-mt-24 text-xl font-semibold tracking-tight text-foreground"
      {...props}
    >
      {children}
    </h3>
  ),
  h4: ({ children, ...props }: Props<"h4">) => (
    <h4
      className="mb-2 mt-6 scroll-mt-24 text-lg font-semibold text-foreground"
      {...props}
    >
      {children}
    </h4>
  ),
  ul: (props: Props<"ul">) => (
    <ul
      className="mb-6 list-disc space-y-2 pl-6 text-[15px] leading-relaxed text-muted-foreground marker:text-[#d81b60] sm:text-base dark:marker:text-[#ff4081]"
      {...props}
    />
  ),
  ol: (props: Props<"ol">) => (
    <ol
      className="mb-6 list-decimal space-y-2 pl-6 text-[15px] leading-relaxed text-muted-foreground marker:font-semibold marker:text-[#d81b60] sm:text-base dark:marker:text-[#ff4081]"
      {...props}
    />
  ),
  li: (props: Props<"li">) => <li className="pl-1 [&>p]:mb-2" {...props} />,
  strong: (props: Props<"strong">) => (
    <strong className="font-semibold text-foreground" {...props} />
  ),
  em: (props: Props<"em">) => <em className="italic" {...props} />,
  blockquote: (props: Props<"blockquote">) => (
    <blockquote
      className="my-6 border-l-4 border-[#d81b60]/60 bg-muted/40 py-3 pl-5 pr-4 text-foreground/90 [&>p:last-child]:mb-0 dark:border-[#ff4081]/60"
      {...props}
    />
  ),
  hr: () => <hr className="my-10 border-border" />,
  a: MdxLink,
  code: (props: Props<"code">) => (
    <code
      className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground"
      {...props}
    />
  ),
  // Focusable: a block that scrolls sideways and holds nothing focusable is
  // out of a keyboard's reach (WCAG 2.1.1; axe scrollable-region-focusable
  // on /legal, tests/a11y/admin-and-public.spec.ts).
  pre: (props: Props<"pre">) => (
    <pre
      tabIndex={0}
      className="mb-6 overflow-x-auto rounded-xl border border-border bg-muted/50 p-4 font-mono text-sm leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_code]:bg-transparent [&_code]:p-0"
      {...props}
    />
  ),
  // GFM tables scroll on their own: the page never scrolls sideways. The
  // wrapper is a named, focusable region for the same reason as `pre`, named
  // after its section (rehypeTableLabels in lib/content/mdx).
  table: ({ [TABLE_LABEL_PROP]: label, ...props }: TableProps) => (
    <div
      role="region"
      aria-label={tableRegionLabel(label)}
      tabIndex={0}
      className="mb-6 overflow-x-auto rounded-xl border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <table
        className="w-full min-w-[520px] border-collapse text-left text-sm"
        {...props}
      />
    </div>
  ),
  thead: (props: Props<"thead">) => (
    <thead className="bg-muted/60" {...props} />
  ),
  tr: (props: Props<"tr">) => (
    <tr className="border-b border-border last:border-0" {...props} />
  ),
  th: (props: Props<"th">) => (
    <th
      className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-foreground"
      {...props}
    />
  ),
  td: (props: Props<"td">) => (
    <td
      className="px-4 py-3 align-top leading-relaxed text-muted-foreground"
      {...props}
    />
  ),
};

// The blog reads in the redesign's editorial prose (site/editorial/prose).
const blogMdxComponents: MdxComponents = blogProseComponents;

export { baseMdxComponents, blogMdxComponents };
