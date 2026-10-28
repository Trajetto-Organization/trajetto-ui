/**
 * The API reads the browser may make through the same-origin relay
 * (`app/api/relay/[...path]/route.ts`), and only these.
 *
 * The relay attaches the session's access token on the server, so the page
 * never holds it. It is closed: a path not listed here is a 404 without
 * reaching the API, so the relay cannot become a general authenticated
 * proxy. GET for these reads; writes stay Server Actions, except the two
 * imports in RELAY_UPLOAD_PATHS below. Id segments are `[\w-]+`, which also
 * keeps `.` and `..` out of the forwarded path.
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

  // Screen reads that were Server Actions used as react-query queryFns
  // (lib/relay-read): Next ran them one at a time, so a screen's reads
  // chained. Each is a GET the API authorizes exactly as before (same
  // token, same guard); a path that shares a write's URL is still only GET
  // here.
  // Every protected page: the alert sound switch and the tickets' counts
  // (`/chat/tickets/summary`, below). Conversas: the list, a ticket, its
  // trail, who can take it (`/assignees`), the history and its search.
  /^\/notification\/preferences$/,
  /^\/chat\/tickets$/,
  new RegExp(`^/chat/tickets/${ID}(/events)?$`),
  /^\/chat\/(list-messages|search-messages|recipients)$/,
  // What a new ticket can be about (the driver's open work).
  /^\/delivery\/list-delivery$/,
  /^\/route\/list-routes$/,
  // Sistema (MASTER only, enforced by the API).
  /^\/health\/(metrics|providers)$/,
  // The deliveries' panels and the delivery detail.
  /^\/delivery\/(message-templates|occurrence-authorizations|proof-audits)$/,
  new RegExp(`^/delivery/get-delivery/${ID}/business/${ID}$`),
  /^\/route\/monitoring(\/drivers)?$/,
  /^\/occurrence-type\/list-occurrence-type$/,
  /^\/status-change-reason\/list-status-change-reason$/,
  // Limites and the company's plan.
  new RegExp(`^/business/entitlements/${ID}$`),
  // Integrações.
  /^\/integrations\/(api-keys|webhook-endpoints|webhook-deliveries|api-usage)$/,
  // An analysis' progress (the AI verification card).
  new RegExp(`^/ai-analysis/progress/${ID}/${ID}$`),
];

/**
 * Files the browser downloads and an import it follows, through the same
 * GET relay. The exports used to be Server Actions that buffered the whole
 * file, base64-encoded, in the Next heap (src/lib/export-download.ts says
 * why); the relay streams the body.
 */
const RELAY_DOWNLOAD_PATHS: readonly RegExp[] = [
  /^\/delivery\/export-(delivery|occurrence)$/,
  /^\/driver\/export-driver$/,
  /^\/fines\/export-fine$/,
  /^\/fuel\/export-fuel$/,
  /^\/service-order\/export-service-order$/,
  /^\/vehicle\/export-vehicle$/,
  /^\/vehicle-checklist\/export-vehicle-checklist$/,
  /^\/account-payable\/export-account-payable$/,
  // The spreadsheet model, and an upload's progress and report.
  /^\/import\/download-template$/,
  new RegExp(`^/import/get-import/${ID}/business/${ID}$`),
];

/**
 * The only writes the relay carries: the two imports, whose bodies (a
 * base64 spreadsheet up to 6 MB, 25 NF-e of 512 KB) are past the 1 MB a
 * Server Action accepts. POST, JSON, same-origin only (the route checks),
 * each with the API's own body ceiling so the relay is never the bigger
 * door (import-routes.ts, delivery-routes.ts).
 */
const RELAY_UPLOAD_PATHS: ReadonlyArray<{
  pattern: RegExp;
  maxBytes: number;
}> = [
  {
    pattern: new RegExp(`^/import/import-spreadsheet/${ID}$`),
    maxBytes: 9 * 1024 * 1024,
  },
  {
    pattern: new RegExp(`^/delivery/import-xml/${ID}$`),
    maxBytes: 13 * 1024 * 1024,
  },
];

const RELAY_BASE = "/api/relay";

function isRelayPath(path: string): boolean {
  return [...RELAY_PATHS, ...RELAY_DOWNLOAD_PATHS].some((pattern) =>
    pattern.test(path),
  );
}

/** The body ceiling of an upload the relay carries, or null when it is not one. */
function relayUploadLimit(path: string): number | null {
  return (
    RELAY_UPLOAD_PATHS.find(({ pattern }) => pattern.test(path))?.maxBytes ??
    null
  );
}

/** The same-origin URL for an API path (`/user/me`) plus its query. */
function relayUrl(path: string, query?: URLSearchParams | string): string {
  const search = query ? String(query) : "";

  return `${RELAY_BASE}${path}${search ? `?${search}` : ""}`;
}

export {
  RELAY_BASE,
  RELAY_DOWNLOAD_PATHS,
  RELAY_PATHS,
  RELAY_UPLOAD_PATHS,
  isRelayPath,
  relayUploadLimit,
  relayUrl,
};
