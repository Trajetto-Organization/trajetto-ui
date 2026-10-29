import { rendersPerRequest } from "./content-security-policy";

/**
 * The CSP a browser enforces is the one of the document it loaded first: a
 * client-side (soft) navigation fetches the next page's RSC payload, and that
 * response's headers never replace the document's policy. So a soft hop from
 * a prerendered page (the 'unsafe-inline' variant) into /login or the
 * logged-in area would run them under the weaker policy until a hard load.
 *
 * Two layers close that: links from the public pages into per-request pages
 * are plain anchors (DocumentLink), and as a backstop StrictCspGuard reloads
 * a per-request page whose document carries no nonce.
 */

/** Same-origin path of an href, or undefined for other origins/schemes. */
function pathOf(href: string): string | undefined {
  if (!href.startsWith("/") || href.startsWith("//")) return undefined;

  return href.split(/[?#]/, 1)[0] || "/";
}

/** Whether following `href` must load a new document to get the strict CSP. */
export function needsDocumentLoad(href: string): boolean {
  const path = pathOf(href);

  return path !== undefined && rendersPerRequest(path);
}

/**
 * Whether this document was served with the nonce policy. Next stamps the
 * nonce on every script it writes; browsers blank the attribute's value
 * (nonce hiding) but keep the attribute, so presence is the signal.
 */
export function documentHasNonce(
  doc: Pick<Document, "querySelector">,
): boolean {
  return doc.querySelector("script[nonce]") !== null;
}

const RELOAD_MARK = "trajetto:csp-reload:";

/**
 * Reloads a per-request page that is running under a nonce-less document.
 * At most once per path until a strict document is seen again: if the reload
 * still lands without a nonce (misconfiguration), it must not loop.
 * Returns whether it reloaded.
 */
export function enforceStrictDocument({
  pathname,
  hasNonce,
  storage,
  reload,
}: {
  pathname: string;
  hasNonce: boolean;
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
  reload: () => void;
}): boolean {
  if (!rendersPerRequest(pathname)) return false;

  const key = RELOAD_MARK + pathname;

  try {
    if (hasNonce) {
      storage?.removeItem(key);
      return false;
    }

    if (!storage || storage.getItem(key)) return false;

    storage.setItem(key, String(Date.now()));
  } catch {
    // Storage blocked: without the loop guard, do not reload at all.
    return false;
  }

  reload();

  return true;
}
