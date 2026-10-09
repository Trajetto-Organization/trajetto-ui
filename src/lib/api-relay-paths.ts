/**
 * The API reads the browser may make through the same-origin relay
 * (`app/api/relay/[...path]/route.ts`), and only these.
 *
 * The relay attaches the session's access token on the server, so the page
 * never holds it. It is GET-only and closed: a path not listed here is a
 * 404 without reaching the API, so the relay cannot become a general
 * authenticated proxy. Writes stay Server Actions. Id segments are
 * `[\w-]+`, which also keeps `.` and `..` out of the forwarded path.
 */
const ID = String.raw`[\w-]+`;

const RELAY_PATHS: readonly RegExp[] = [
  // The cursor pickers (hooks/use-cursor-search.ts).
  /^\/(account-payable|branch|business|driver|fuel-type|part|profile-access|service-order|shipper|supplier|traffic-violation|user|vehicle-type|vehicle)\/search-[a-z-]+$/,
  new RegExp(`^/fuel/search-fuel-by-vehicle/${ID}$`),
  new RegExp(`^/service-order/search-service-order-by-vehicle/${ID}$`),

  // The bell and the notifications page.
  /^\/notification\/stream$/,

  // The protected area's session check (navigation-security-check).
  /^\/user\/me$/,

  // Screen reads that page or refresh in the browser.
  new RegExp(`^/kanban/list/${ID}$`),
  /^\/dashboard\/trends$/,
  new RegExp(`^/permission/list-by-profile/${ID}$`),
  new RegExp(`^/business/get-ai-usage/${ID}$`),
  new RegExp(`^/fuel/get-previous-fuel/${ID}$`),
  new RegExp(`^/vehicle/get-vehicle/${ID}/business/${ID}$`),
];

const RELAY_BASE = "/api/relay";

function isRelayPath(path: string): boolean {
  return RELAY_PATHS.some((pattern) => pattern.test(path));
}

/** The same-origin URL for an API path (`/user/me`) plus its query. */
function relayUrl(path: string, query?: URLSearchParams | string): string {
  const search = query ? String(query) : "";

  return `${RELAY_BASE}${path}${search ? `?${search}` : ""}`;
}

export { RELAY_BASE, RELAY_PATHS, isRelayPath, relayUrl };
