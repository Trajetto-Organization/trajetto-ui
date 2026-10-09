import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { SiteFooter } from "./site-footer";
import { SiteHeader, type SiteSection } from "./site-header";

interface SiteShellProps {
  children: ReactNode;
  /** Overrides the header's active entry (read from the pathname otherwise). */
  active?: SiteSection;
  /** Leaves the footer out (e.g. a page that draws its own closing band). */
  footer?: boolean;
  className?: string;
}

/**
 * The frame of every public page: the site root (tokens, Inter, the theme
 * fade), the fixed header and the footer. The page renders its own <main>.
 * The header is fixed and 70px tall (12px offset + 58px bar): the first
 * section of a page pads its top for it.
 */
const SiteShell = ({
  children,
  active,
  footer = true,
  className,
}: SiteShellProps): JSX.Element => (
  <div className={cn("site-root flex min-h-screen flex-1 flex-col", className)}>
    <SiteHeader active={active} />
    {children}
    {footer ? <SiteFooter /> : null}
  </div>
);

export { SiteShell };
export type { SiteShellProps };
