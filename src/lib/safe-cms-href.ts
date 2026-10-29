/**
 * An href from the site's content (blog and legal MDX) made safe to render.
 * The MDX is reviewed code, but a `javascript:` link would run on the same
 * origin as the signed-in area, so the check stays: it costs nothing.
 *
 * An allowlist of schemes rather than a denylist of `javascript:`: browsers
 * ignore tabs and newlines inside a URL and control characters around it, and
 * `data:` and `vbscript:` run script too. Anything that is not web, e-mail,
 * phone, a same-site path or an anchor becomes a link to nowhere.
 *
 * `//host` and `/\host` are other sites dressed as paths (the browser reads
 * both as protocol-relative), so a leading slash only counts when the next
 * character is not another one.
 *
 * Separate from `safeNotificationHref` (safe-href.ts) on purpose: blog posts
 * legitimately link to `mailto:`, `tel:` and in-page anchors, which a
 * notification link never needs.
 */
const SAFE_HREF = /^(?:https?:|mailto:|tel:|#|\/(?![/\\]))/i;

export function safeCmsHref(href: unknown): string {
  if (typeof href !== "string") return "#";

  // What the browser itself strips before parsing, so the check sees what it
  // will navigate to.
  const candidate = href.replace(/[\t\n\r]/g, "").trim();

  return SAFE_HREF.test(candidate) ? candidate : "#";
}
