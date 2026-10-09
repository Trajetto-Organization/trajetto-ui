import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { editorialMdxComponents } from "@/components/site/editorial/prose";

import type { MdxComponents } from "@/lib/content/mdx";
import { cn } from "@/lib/utils";

/**
 * The legal pages' blocks, on the redesign's editorial prose. Each `##`
 * opens a numbered clause with a rule above it, so a clause can be linked
 * by its anchor.
 */

/**
 * A cookie the web app sets. Machine-readable marker:
 * tests/unitaires/legal-cookies.test.ts checks the policy against the code in
 * both directions. Third-party storage stays in prose.
 */
const CookieName = ({ children }: { children: string }) => (
  <code className="rounded-md bg-site-soft2 px-[.42em] py-[.12em] font-site-mono text-[.86em] text-site-ink">
    {children}
  </code>
);

/**
 * Data only the company can fill in, visible on purpose: a plausible example
 * would be a false statement in a text people accept. The design's dashed
 * chip, always prefixed "a definir:".
 */
const Placeholder = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <span
    className={cn(
      "inline-block rounded-[7px] border border-dashed border-site-ink/25 bg-site-soft px-[9px] py-px text-[.88em] text-site-muted",
      className,
    )}
  >
    a definir: {children}
  </span>
);

/** A point flagged for the lawyer's review. */
const NeedsReview = ({ children }: { children: ReactNode }) => (
  <div className="mb-[1.5em] flex items-start gap-3 rounded-[18px] border border-[rgba(245,158,11,.32)] bg-[rgba(245,158,11,.09)] px-5 py-4 text-[14px] leading-relaxed text-[#92400e] dark:text-[#fbbf24]">
    <span aria-hidden className="mt-0.5 shrink-0 font-bold">
      !
    </span>
    <div className="min-w-0 [&>p:last-child]:mb-0 [&>p]:mb-2 [&>p]:text-inherit">
      <span className="sr-only">Ponto para revisão jurídica: </span>
      {children}
    </div>
  </div>
);

const legalMdxComponents: MdxComponents = {
  ...editorialMdxComponents,
  h2: ({ className, children, ...props }: ComponentPropsWithoutRef<"h2">) => (
    <h2
      className={cn(
        "mb-[.7em] mt-[2.2em] scroll-mt-[110px] border-t border-site-line pt-7 font-site-display text-[clamp(26px,2.6vw,32px)] font-medium leading-[1.15] tracking-[-.025em] text-site-ink",
        className,
      )}
      {...props}
    >
      {children}
    </h2>
  ),
  CookieName,
  Placeholder,
  NeedsReview,
};

export { CookieName, NeedsReview, Placeholder, legalMdxComponents };
