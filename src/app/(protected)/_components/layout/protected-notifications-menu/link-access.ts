import { canAccessPath, type RouteAccessContext } from "@/lib/route-access";

/** Any origin that cannot be real, to read a relative link's path against. */
const RELATIVE_BASE = "https://relative.invalid";

/**
 * Whether a notification's (already safe) link may still be opened by the
 * reader (NOTIF-ROLE-1).
 *
 * A notification outlives the access it was sent under: a profile that lost
 * Entregas, or a company whose plan dropped the module, kept a live link to
 * a page the edge then refuses. The verdict is the sidebar's (canAccessPath)
 * on the link's path. With no session known yet nothing is hidden, as the
 * sidebar does. No directive: pure, and tested.
 */
function canOpenNotificationLink(
  href: string,
  context: RouteAccessContext | null,
): boolean {
  if (!context) return true;

  let pathname: string;

  try {
    pathname = new URL(href, RELATIVE_BASE).pathname;
  } catch {
    return false;
  }

  return canAccessPath(pathname, context);
}

export { canOpenNotificationLink };
