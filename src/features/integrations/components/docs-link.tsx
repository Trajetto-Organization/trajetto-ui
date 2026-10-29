import type { ReactNode } from "react";

/**
 * An inline link to a developer portal guide, opened in a new tab so the
 * one-time value on screen is not lost by following it. The portal is public
 * (decision 11.1), so nothing here depends on the session.
 */
const DocsLink = ({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}): JSX.Element => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="rounded-sm font-medium text-primary underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    {children}
    <span className="sr-only"> (abre em nova aba)</span>
  </a>
);

export { DocsLink };
