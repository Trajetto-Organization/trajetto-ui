import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Site type sets size and line-height as separate classes (text-[clamp(…)] +
// leading-[…]); stock tailwind-merge drops a leading-* that precedes any
// font-size class, so a caller overriding only the size lost the line-height.
const twMergeSite = extendTailwindMerge({
  override: { conflictingClassGroups: { "font-size": [] } },
});

function cn(...inputs: ClassValue[]): string {
  return twMergeSite(clsx(inputs));
}

/**
 * Layout and type primitives of the public site, measured on the design
 * files. Server components (no hooks), so any page can use them.
 */

interface ContainerProps extends ComponentPropsWithoutRef<"div"> {
  /** Max width in px: 1200 (default, every section), 1080, 960, 760 (articles)… */
  width?: 1200 | 1080 | 960 | 880 | 760 | 680;
}

const WIDTHS: Record<NonNullable<ContainerProps["width"]>, string> = {
  1200: "max-w-[1200px]",
  1080: "max-w-[1080px]",
  960: "max-w-[960px]",
  880: "max-w-[880px]",
  760: "max-w-[760px]",
  680: "max-w-[680px]",
};

/** Centered column. Horizontal gutter is the Section's job, not this one's. */
const Container = ({
  width = 1200,
  className,
  ...rest
}: ContainerProps): JSX.Element => (
  <div className={cn("mx-auto w-full", WIDTHS[width], className)} {...rest} />
);

type SectionSpacing = "default" | "tight" | "none";

interface SectionProps extends ComponentPropsWithoutRef<"section"> {
  /**
   * Vertical padding. default: clamp(80px,11vw,140px) top and
   * clamp(40px,6vw,64px) bottom, the design's section rhythm. tight:
   * clamp(48px,6vw,72px) both. none: only the side gutter.
   */
  spacing?: SectionSpacing;
}

const SPACING: Record<SectionSpacing, string> = {
  default: "pb-[clamp(40px,6vw,64px)] pt-[clamp(80px,11vw,140px)]",
  tight: "py-[clamp(48px,6vw,72px)]",
  none: "",
};

/** A page section with the design's side gutter: clamp(20px,4vw,40px). */
const Section = ({
  spacing = "default",
  className,
  ...rest
}: SectionProps): JSX.Element => (
  <section
    className={cn("px-[clamp(20px,4vw,40px)]", SPACING[spacing], className)}
    {...rest}
  />
);

interface EyebrowProps extends ComponentPropsWithoutRef<"p"> {
  /** "muted" on the page background, "dark-band" (#9d9fab) on dark bands. */
  tone?: "muted" | "dark-band";
  /** 12px (default) or 11px, the menu's small label. */
  size?: "md" | "sm";
}

/**
 * The monospace label above a heading ("PAINEL WEB"). Write the text in
 * uppercase in the source, as the design does: screen readers then read
 * the words, not letters.
 */
const Eyebrow = ({
  tone = "muted",
  size = "md",
  className,
  ...rest
}: EyebrowProps): JSX.Element => (
  <p
    className={cn(
      "m-0 font-site-mono font-medium",
      size === "md"
        ? "text-xs tracking-[.14em]"
        : "text-[11px] tracking-[.12em]",
      tone === "muted" ? "text-site-muted" : "text-[#9d9fab]",
      className,
    )}
    {...rest}
  />
);

type HeadingSize = "hero" | "xl" | "lg" | "md" | "sm";

/*
 * The heading scale of the design (SF Pro Display there, Inter Tight here):
 *   hero  h1 clamp(44px,7vw,96px)   lh .96  ls -.045em  (page heroes)
 *   xl    h2 clamp(36px,5vw,68px)   lh 1    ls -.04em   (big statements)
 *   lg    h2 clamp(34px,4.4vw,58px) lh 1.02 ls -.035em  (most sections)
 *   md    h2 clamp(28px,3.4vw,44px) lh 1.06 ls -.03em
 *   sm    h3 clamp(24px,2.4vw,30px)         ls -.025em  (cards)
 * Any other clamp of the design goes in className (text-[clamp(…)]).
 */
const HEADING_SIZES: Record<HeadingSize, string> = {
  hero: "text-[clamp(44px,7vw,96px)] leading-[.96] tracking-[-.045em]",
  xl: "text-[clamp(36px,5vw,68px)] leading-none tracking-[-.04em]",
  lg: "text-[clamp(34px,4.4vw,58px)] leading-[1.02] tracking-[-.035em]",
  md: "text-[clamp(28px,3.4vw,44px)] leading-[1.06] tracking-[-.03em]",
  sm: "text-[clamp(24px,2.4vw,30px)] leading-[1.15] tracking-[-.025em]",
};

const DEFAULT_TAG: Record<HeadingSize, ElementType> = {
  hero: "h1",
  xl: "h2",
  lg: "h2",
  md: "h2",
  sm: "h3",
};

interface SectionHeadingProps extends ComponentPropsWithoutRef<"h2"> {
  size?: HeadingSize;
  /** The element; defaults to h1 for "hero", h3 for "sm", h2 otherwise. */
  as?: ElementType;
  /** text-wrap: balance (default on), like the design. */
  balance?: boolean;
}

const SectionHeading = ({
  size = "lg",
  as,
  balance = true,
  className,
  ...rest
}: SectionHeadingProps): JSX.Element => {
  const Tag = as ?? DEFAULT_TAG[size];

  return (
    <Tag
      className={cn(
        "m-0 font-site-display font-medium",
        HEADING_SIZES[size],
        balance && "[text-wrap:balance]",
        className,
      )}
      {...rest}
    />
  );
};

interface LeadProps extends ComponentPropsWithoutRef<"p"> {
  /** "lg": clamp(17px,1.5vw,20px) (heroes), "md": 17px (sections). */
  size?: "lg" | "md";
}

/** The muted paragraph under a heading, line-height 1.6, text-wrap pretty. */
const Lead = ({ size = "md", className, ...rest }: LeadProps): JSX.Element => (
  <p
    className={cn(
      "m-0 leading-[1.6] text-site-muted [text-wrap:pretty]",
      size === "lg" ? "text-[clamp(17px,1.5vw,20px)]" : "text-[17px]",
      className,
    )}
    {...rest}
  />
);

interface SectionHeaderProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  /** Heading id, for `aria-labelledby` on the section. */
  id?: string;
  size?: HeadingSize;
  align?: "start" | "center";
  className?: string;
}

/** Eyebrow + heading + lead, the opening of most sections (16px / 20px gaps). */
const SectionHeader = ({
  eyebrow,
  title,
  lead,
  id,
  size = "lg",
  align = "start",
  className,
}: SectionHeaderProps): JSX.Element => (
  <div
    className={cn(
      align === "center" && "mx-auto text-center",
      "max-w-[760px]",
      className,
    )}
  >
    {eyebrow ? <Eyebrow className="mb-4">{eyebrow}</Eyebrow> : null}
    <SectionHeading id={id} size={size}>
      {title}
    </SectionHeading>
    {lead ? (
      <Lead
        className={cn("mt-5 max-w-[600px]", align === "center" && "mx-auto")}
      >
        {lead}
      </Lead>
    ) : null}
  </div>
);

export { Container, Eyebrow, Lead, Section, SectionHeader, SectionHeading };
export type {
  ContainerProps,
  EyebrowProps,
  HeadingSize,
  LeadProps,
  SectionHeaderProps,
  SectionHeadingProps,
  SectionProps,
};
