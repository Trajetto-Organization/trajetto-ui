import type { ComponentPropsWithoutRef } from "react";

import Link from "next/link";

import { needsDocumentLoad } from "@/lib/strict-csp-document";

type DocumentLinkProps = Omit<ComponentPropsWithoutRef<typeof Link>, "href"> & {
  href: string;
};

/**
 * A link for the public (prerendered) pages. Into a per-request page
 * (/login, /docs, the logged-in area) it is a plain anchor: a full document
 * load, so that page runs under the nonce CSP instead of inheriting the
 * prerendered page's 'unsafe-inline' one. Elsewhere it is next/link.
 */
const DocumentLink = ({
  href,
  prefetch,
  replace,
  scroll,
  shallow,
  passHref,
  legacyBehavior,
  locale,
  ...rest
}: DocumentLinkProps) => {
  if (needsDocumentLoad(href)) {
    return <a {...rest} href={href} />;
  }

  return (
    <Link
      {...rest}
      href={href}
      prefetch={prefetch}
      replace={replace}
      scroll={scroll}
      shallow={shallow}
      passHref={passHref}
      legacyBehavior={legacyBehavior}
      locale={locale}
    />
  );
};

export { DocumentLink };
