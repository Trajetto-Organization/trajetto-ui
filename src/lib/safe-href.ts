/**
 * The `href` a notification may be rendered with, or `null` for none.
 *
 * `notification.link` is a string from the API, rendered straight into an
 * anchor. Every policy builds it from a template today (`${baseUrl}/...`), so
 * no user input reaches it — but the moment one does (a new policy, a webhook
 * payload), a `javascript:` link would run in the reader's session on a
 * click. React 18 only warns about those; it still renders them.
 *
 * So the scheme is checked where the link is rendered:
 *
 *   - an absolute `https:` or `http:` URL is kept. `http:` too, because the
 *     links are `${env.HTTP_REQUEST}/...` and that is http://localhost in
 *     development; neither scheme can run script.
 *   - a path of this app (`/dashboard/...`) is kept.
 *   - everything else is dropped: `javascript:`, `data:`, `vbscript:` in any
 *     case and behind any whitespace, and the relative forms a browser
 *     resolves OFF this app (`//host`, `/\host`, `/<tab>/host`).
 *
 * Decided by the WHATWG parser, the same one the browser will use, rather
 * than by prefix matching: the parser strips tabs and newlines anywhere and
 * treats `\` as `/`, which is exactly what prefix checks miss.
 *
 * Stricter than `safeCmsHref` (the blog's), on purpose: a notification has
 * no business carrying `mailto:`, `tel:` or a bare fragment.
 */
const SAFE_SCHEMES = new Set(["https:", "http:"]);

/** Any origin that cannot be real, to resolve relative links against. */
const RELATIVE_BASE = "https://relative.invalid";

const EXPLICIT_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

function safeNotificationHref(link?: string | null): string | null {
  if (typeof link !== "string") return null;

  const candidate = link.trim();
  if (!candidate) return null;

  let url: URL;

  try {
    url = new URL(candidate, RELATIVE_BASE);
  } catch {
    return null;
  }

  if (!EXPLICIT_SCHEME.test(candidate)) {
    // Relative: it has to stay on this app, and be a root path.
    if (url.origin !== RELATIVE_BASE || !candidate.startsWith("/")) {
      return null;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  }

  return SAFE_SCHEMES.has(url.protocol) ? url.href : null;
}

export { safeNotificationHref };
