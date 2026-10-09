import type { ButtonHTMLAttributes, ReactNode } from "react";

import { ArrowRight } from "lucide-react";

import { DocumentLink } from "@/components/shared/document-link";
import { cn } from "@/lib/utils";

/**
 * The design's buttons, one primitive for links and buttons.
 *
 * No "use client" and no hooks on purpose: a server page can render it, and
 * the hover motion is CSS (`group-hover`). The arrow slides ~4px on hover and
 * on keyboard focus; `motion-reduce` keeps it still.
 */

type SiteButtonVariant =
  /** Ink fill with the page background as text: the main call to action. */
  | "primary"
  /** Outline on the page background ("Ver como funciona"). */
  | "secondary"
  /** Surface fill with an outline (product chips on Sobre). */
  | "surface"
  /** Light fill, for dark bands (the closing CTA). */
  | "light"
  /** Translucent outline, for dark bands ("Falar com a equipe"). */
  | "ghost-dark"
  /** Text with an underline that darkens on hover ("Conheça o app completo"). */
  | "text";

type SiteButtonSize = "lg" | "md" | "sm";

const BASE =
  "group/arrow inline-flex items-center justify-center whitespace-nowrap font-medium " +
  "outline-none transition-[transform,box-shadow,background-color,border-color,color] [transition-duration:250ms] ease-site " +
  "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-site-bg disabled:pointer-events-none disabled:opacity-60";

const VARIANTS: Record<SiteButtonVariant, string> = {
  primary:
    "bg-site-ink text-site-bg shadow-site-cta hover:-translate-y-0.5 hover:shadow-site-cta-hover focus-visible:ring-site-ink/50 motion-reduce:hover:translate-y-0",
  secondary:
    "border border-site-line2 text-site-ink hover:bg-site-surface focus-visible:ring-site-ink/40",
  surface:
    "border border-site-line2 bg-site-surface text-site-ink hover:-translate-y-0.5 focus-visible:ring-site-ink/40 motion-reduce:hover:translate-y-0",
  light:
    "bg-[#f5f5f7] text-[#0e0e14] hover:-translate-y-0.5 focus-visible:ring-white/60 motion-reduce:hover:translate-y-0",
  "ghost-dark":
    "border border-white/20 text-[#f5f5f7] hover:bg-white/[.06] focus-visible:ring-white/50",
  text: "gap-2 rounded-none border-b border-site-line2 pb-0.5 text-[15px] text-site-ink hover:border-site-ink focus-visible:ring-site-ink/40",
};

// Paddings and radii of the design: 15/22 r14 (hero), 12/18 r14, 10/16 r12 (header).
const SIZES: Record<SiteButtonSize, string> = {
  lg: "min-h-[52px] gap-2.5 rounded-[14px] px-[22px] py-[15px] text-base",
  md: "min-h-[46px] gap-2.5 rounded-[14px] px-[18px] py-3 text-[15px]",
  sm: "min-h-[40px] gap-1.5 rounded-[12px] px-4 py-2.5 text-sm",
};

interface SiteButtonStyle {
  variant?: SiteButtonVariant;
  size?: SiteButtonSize;
  className?: string;
}

/** Classes of a site button, for elements this file does not render (a form submit). */
function siteButtonClass({
  variant = "primary",
  size = "lg",
  className,
}: SiteButtonStyle = {}): string {
  return cn(
    BASE,
    variant === "text" ? "" : SIZES[size],
    VARIANTS[variant],
    className,
  );
}

/** The moving arrow. Exported for custom buttons that want the same motion. */
const MovingArrow = ({
  size = 18,
  className,
}: {
  size?: number;
  className?: string;
}) => (
  <ArrowRight
    aria-hidden
    width={size}
    height={size}
    className={cn(
      "shrink-0 transition-transform duration-200 ease-out",
      "group-hover/arrow:translate-x-1 group-focus-visible/arrow:translate-x-1 motion-reduce:!translate-x-0",
      className,
    )}
  />
);

interface ArrowLinkProps extends SiteButtonStyle {
  href: string;
  children: ReactNode;
  /** Shows the arrow (default). `false` gives the same button without it. */
  arrow?: boolean;
  /** Arrow size in px: 18 for buttons, 16 for text links. */
  arrowSize?: number;
  /** Opens an external URL in a new tab, with rel="noopener noreferrer". */
  external?: boolean;
  "aria-label"?: string;
  "aria-current"?: "page" | undefined;
  onClick?: () => void;
}

/**
 * A link styled as a site button. Internal hrefs go through DocumentLink:
 * a full page load into per-request pages (/login, /docs), next/link
 * between the prerendered ones.
 */
const ArrowLink = ({
  href,
  children,
  arrow = true,
  arrowSize,
  external,
  variant,
  size,
  className,
  ...rest
}: ArrowLinkProps): JSX.Element => {
  const classes = siteButtonClass({ variant, size, className });
  const content = (
    <>
      {children}
      {arrow ? (
        <MovingArrow size={arrowSize ?? (variant === "text" ? 16 : 18)} />
      ) : null}
    </>
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
        {...rest}
      >
        {content}
      </a>
    );
  }

  return (
    <DocumentLink href={href} className={classes} {...rest}>
      {content}
    </DocumentLink>
  );
};

interface ArrowButtonProps
  extends
    SiteButtonStyle,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  arrow?: boolean;
  arrowSize?: number;
}

/** A `<button>` styled as a site button (type="button" unless given). */
const ArrowButton = ({
  children,
  arrow = true,
  arrowSize,
  variant,
  size,
  className,
  type = "button",
  ...rest
}: ArrowButtonProps): JSX.Element => (
  <button
    type={type}
    className={siteButtonClass({ variant, size, className })}
    {...rest}
  >
    {children}
    {arrow ? (
      <MovingArrow size={arrowSize ?? (variant === "text" ? 16 : 18)} />
    ) : null}
  </button>
);

export { ArrowButton, ArrowLink, MovingArrow, siteButtonClass };
export type {
  ArrowButtonProps,
  ArrowLinkProps,
  SiteButtonSize,
  SiteButtonVariant,
};
