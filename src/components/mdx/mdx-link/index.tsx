import type { ComponentPropsWithoutRef } from "react";

import { DocumentLink } from "@/components/shared/document-link";

import { safeCmsHref } from "@/lib/safe-cms-href";
import { cn } from "@/lib/utils";

type MdxLinkProps = ComponentPropsWithoutRef<"a">;

const LINK_CLASS =
  "font-medium text-[#c2185b] underline decoration-[#c2185b]/30 underline-offset-4 transition-colors hover:decoration-current dark:text-[#ff4081] dark:decoration-[#ff4081]/30";

/**
 * Links written in the content. Reviewed code, but the scheme check stays:
 * it costs nothing and a `javascript:` href would run on this origin, next
 * to the logged-in area.
 */
const MdxLink = ({ href, children, className, ...rest }: MdxLinkProps) => {
  const safe = safeCmsHref(href);
  const classes = cn(LINK_CLASS, className);

  if (/^https?:\/\//i.test(safe)) {
    return (
      <a
        {...rest}
        href={safe}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
      >
        {children}
        <span className="sr-only"> (abre em nova aba)</span>
      </a>
    );
  }

  if (safe.startsWith("/")) {
    return (
      <DocumentLink {...rest} href={safe} className={classes}>
        {children}
      </DocumentLink>
    );
  }

  // In-page anchors, mailto: and tel:.
  return (
    <a {...rest} href={safe} className={classes}>
      {children}
    </a>
  );
};

export { MdxLink };
