/**
 * The sidebar's open/collapsed preference, kept in the `sidebar:state` cookie.
 *
 * The sidebar wrote it on every toggle but nothing read it, so a collapsed
 * menu opened again on every full load (and cookies.mdx had to say so). The
 * protected layout now reads it on the server and hands it to the provider
 * as `defaultOpen`, so the first paint already has the person's choice.
 *
 * No directive: the server layout imports it, and a constant exported from a
 * "use client" module reaches a server component only as a client reference.
 */
const SIDEBAR_COOKIE_NAME = "sidebar:state";

/** What the layout needs from Next's cookie store. */
interface SidebarCookieStore {
  get(name: string): { value: string } | undefined;
}

/**
 * Whether the sidebar starts open. Only an explicit "false" collapses it:
 * no cookie, or anything else in it, keeps the default (open).
 */
function readSidebarOpen(cookieStore: SidebarCookieStore): boolean {
  return cookieStore.get(SIDEBAR_COOKIE_NAME)?.value !== "false";
}

export { SIDEBAR_COOKIE_NAME, readSidebarOpen };
export type { SidebarCookieStore };
