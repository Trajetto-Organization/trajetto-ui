import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { AlertTriangle, Info, Lightbulb } from "lucide-react";

import { MdxLink } from "@/components/mdx/mdx-link";

import type { MdxComponents } from "@/lib/content/mdx";
import {
  TABLE_LABEL_PROP,
  tableRegionLabel,
  type TableProps,
} from "@/lib/content/table-label";
import { cn } from "@/lib/utils";

/**
 * The reading type of the blog articles and the legal pages (the design's
 * prose, trajetto-content.js `S`), as MDX components on the site tokens.
 * Bullets, links and blockquotes take the accent `--acc` ("r g b") of the
 * scope they render in: the post's category on an article, the ink on the
 * legal pages. The docs portal keeps its own look (`baseMdxComponents`).
 */

type Props<T extends keyof JSX.IntrinsicElements> = ComponentPropsWithoutRef<T>;

/** Body text: #2a2b33 / #d4d5dc, the design's ink2 (no site token for it). */
const INK2 = "text-[#2a2b33] dark:text-[#d4d5dc]";

// Items of both lists: 16.5px / 1.7, the marker drawn in ::before.
const ITEM =
  "[&>li]:relative [&>li]:text-[16.5px] [&>li]:leading-[1.7] [&>li]:before:absolute [&>li]:before:content-['']";

const editorialMdxComponents: MdxComponents = {
  p: ({ className, ...props }: Props<"p">) => (
    <p
      className={cn(
        "mb-[1.15em] mt-0 text-[17px] leading-[1.75] [text-wrap:pretty]",
        INK2,
        className,
      )}
      {...props}
    />
  ),
  h2: ({ className, children, ...props }: Props<"h2">) => (
    <h2
      className={cn(
        "mb-[.7em] mt-[2.2em] scroll-mt-[110px] font-site-display text-[clamp(26px,2.6vw,32px)] font-medium leading-[1.15] tracking-[-.025em] text-site-ink",
        className,
      )}
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ className, children, ...props }: Props<"h3">) => (
    <h3
      className={cn(
        "mb-[.55em] mt-[1.8em] scroll-mt-[110px] text-[19px] font-semibold leading-[1.35] tracking-[-.01em] text-site-ink",
        className,
      )}
      {...props}
    >
      {children}
    </h3>
  ),
  h4: ({ className, children, ...props }: Props<"h4">) => (
    <h4
      className={cn(
        "mb-[.5em] mt-[1.6em] scroll-mt-[110px] text-[17px] font-semibold leading-[1.4] text-site-ink",
        className,
      )}
      {...props}
    >
      {children}
    </h4>
  ),
  ul: ({ className, ...props }: Props<"ul">) => (
    <ul
      className={cn(
        "mb-[1.3em] mt-0 flex list-none flex-col gap-2.5 p-0",
        ITEM,
        "[&>li]:pl-[22px] [&>li]:before:left-1 [&>li]:before:top-[.72em] [&>li]:before:size-1.5 [&>li]:before:rounded-[2px] [&>li]:before:bg-[rgb(var(--acc))]",
        // A list inside an item: closer, and grey squares.
        "[li>&]:mb-0 [li>&]:mt-2.5 [&_ul>li]:before:bg-site-line2",
        className,
      )}
      {...props}
    />
  ),
  ol: ({ className, ...props }: Props<"ol">) => (
    <ol
      className={cn(
        "mb-[1.3em] mt-0 flex list-none flex-col gap-2.5 p-0 [counter-reset:editorial-ol]",
        ITEM,
        // The number in a 26px rounded tile, as the design.
        "[&>li]:pl-10 [&>li]:[counter-increment:editorial-ol] [&>li]:before:left-0 [&>li]:before:top-[.15em] [&>li]:before:flex [&>li]:before:size-[26px] [&>li]:before:items-center [&>li]:before:justify-center [&>li]:before:rounded-lg [&>li]:before:bg-site-soft2 [&>li]:before:font-site-mono [&>li]:before:text-xs [&>li]:before:leading-none [&>li]:before:text-site-ink [&>li]:before:content-[counter(editorial-ol)]",
        "[li>&]:mb-0 [li>&]:mt-2.5",
        className,
      )}
      {...props}
    />
  ),
  li: ({ className, ...props }: Props<"li">) => (
    <li
      className={cn(
        INK2,
        "[&>p:last-child]:mb-0 [&>p]:mb-2 [&>p]:text-[16.5px] [&>p]:leading-[1.7]",
        className,
      )}
      {...props}
    />
  ),
  strong: ({ className, ...props }: Props<"strong">) => (
    <strong
      className={cn("font-semibold text-site-ink", className)}
      {...props}
    />
  ),
  em: ({ className, ...props }: Props<"em">) => (
    <em className={cn("italic", className)} {...props} />
  ),
  blockquote: ({ className, ...props }: Props<"blockquote">) => (
    <blockquote
      className={cn(
        "mx-0 mb-[1.5em] mt-0 border-l-2 border-[rgb(var(--acc))] py-1 pl-5 text-site-ink [&>p:last-child]:mb-0",
        className,
      )}
      {...props}
    />
  ),
  hr: () => <hr className="my-10 border-0 border-t border-site-line" />,
  a: ({ className, ...props }: Props<"a">) => (
    <MdxLink
      {...props}
      className={cn(
        "font-medium text-site-ink decoration-[rgb(var(--acc))] decoration-[1.5px] underline-offset-[3px] hover:decoration-[rgb(var(--acc))] dark:text-site-ink dark:decoration-[rgb(var(--acc))]",
        "rounded-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-site-ink/40",
        className,
      )}
    />
  ),
  code: ({ className, ...props }: Props<"code">) => (
    <code
      className={cn(
        "rounded-md bg-site-soft2 px-[.42em] py-[.12em] font-site-mono text-[.86em] text-site-ink",
        className,
      )}
      {...props}
    />
  ),
  // Focusable: a block that scrolls sideways and holds nothing focusable is
  // out of a keyboard's reach (WCAG 2.1.1, axe scrollable-region-focusable).
  // Dark in both themes, like the design; a hairline separates it from the
  // near-black page in the dark theme.
  pre: ({ className, ...props }: Props<"pre">) => (
    <pre
      tabIndex={0}
      className={cn(
        "mb-[1.4em] mt-0 overflow-x-auto rounded-2xl bg-[#0e0e14] px-5 py-[18px] font-site-mono text-[13.5px] leading-[1.65] text-[#e7e7ee] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-site-ink/40",
        "[&_code]:rounded-none [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-[length:inherit] [&_code]:text-inherit",
        className,
      )}
      {...props}
    />
  ),
  // GFM tables scroll on their own, never the page; the wrapper is a named,
  // focusable region for the same reason as `pre`, named after its section
  // (rehypeTableLabels in lib/content/mdx).
  table: ({ className, [TABLE_LABEL_PROP]: label, ...props }: TableProps) => (
    <div
      role="region"
      aria-label={tableRegionLabel(label)}
      tabIndex={0}
      className="mb-[1.5em] overflow-x-auto rounded-2xl border border-site-line bg-site-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-site-ink/40"
    >
      <table
        className={cn(
          "w-full border-collapse text-[14.5px] leading-[1.55]",
          className,
        )}
        {...props}
      />
    </div>
  ),
  thead: (props: Props<"thead">) => <thead {...props} />,
  tr: (props: Props<"tr">) => <tr {...props} />,
  th: ({ className, ...props }: Props<"th">) => (
    <th
      className={cn(
        "whitespace-nowrap border-b border-site-line bg-site-soft px-4 py-3 text-left text-[12.5px] font-semibold text-site-muted",
        className,
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }: Props<"td">) => (
    <td
      className={cn(
        "min-w-[140px] border-t border-site-line px-4 py-[13px] align-top first:font-medium first:text-site-ink",
        INK2,
        className,
      )}
      {...props}
    />
  ),
};

type CalloutType = "info" | "dica" | "atencao";

// The design's three tones (green tip, amber warning, blue note); text a
// step lighter in the dark theme to keep 4.5:1 on the tinted box.
const CALLOUTS: Record<
  CalloutType,
  { icon: typeof Info; label: string; box: string; tone: string }
> = {
  dica: {
    icon: Lightbulb,
    label: "Dica",
    box: "border-[rgba(16,185,129,.28)] bg-[rgba(16,185,129,.08)]",
    tone: "text-[#047857] dark:text-[#34d399]",
  },
  atencao: {
    icon: AlertTriangle,
    label: "Atenção",
    box: "border-[rgba(245,158,11,.32)] bg-[rgba(245,158,11,.09)]",
    tone: "text-[#92400e] dark:text-[#fbbf24]",
  },
  info: {
    icon: Info,
    label: "Nota",
    box: "border-[rgba(37,99,235,.25)] bg-[rgba(37,99,235,.07)]",
    tone: "text-[#1d4ed8] dark:text-[#60a5fa]",
  },
};

interface EditorialCalloutProps {
  type?: CalloutType;
  title?: string;
  children: ReactNode;
}

/** `<Callout type="dica" title="…">` in an article. */
const EditorialCallout = ({
  type = "info",
  title,
  children,
}: EditorialCalloutProps) => {
  const variant = CALLOUTS[type] ?? CALLOUTS.info;
  const Icon = variant.icon;

  // A note, not an <aside>: inside the article an aside is a nested
  // complementary landmark (axe landmark-complementary-is-top-level).
  return (
    <div
      role="note"
      aria-label={title ?? variant.label}
      className={cn(
        "mb-[1.5em] flex gap-3.5 rounded-[18px] border px-5 py-[18px]",
        variant.box,
      )}
    >
      <Icon
        aria-hidden
        className={cn("mt-[3px] size-[18px] shrink-0", variant.tone)}
      />
      <div className="flex min-w-0 flex-col gap-1.5 [&>p]:m-0">
        <p
          className={cn(
            "text-[13px] font-semibold tracking-[.02em]",
            variant.tone,
          )}
        >
          {title ?? variant.label}
        </p>
        {children}
      </div>
    </div>
  );
};

/** The article's prose. */
const blogProseComponents: MdxComponents = {
  ...editorialMdxComponents,
  Callout: EditorialCallout,
};

export { EditorialCallout, blogProseComponents, editorialMdxComponents };
export type { CalloutType };
