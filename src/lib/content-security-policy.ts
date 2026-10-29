import { THEME_INIT_SCRIPT_HASH } from "./theme-init-script";

/**
 * The page's Content-Security-Policy: which scripts may run, and where a
 * script may send what it read. Enforced (not Report-Only).
 *
 * Built per request by the middleware, because the part that contains an XSS
 * needs a nonce: Next 14 inlines its bootstrap and its RSC payload, so a
 * static `script-src` without `'unsafe-inline'` breaks hydration, and with it
 * lets an injected `<img onerror>` run again. Next reads the nonce back from
 * the request's CSP header and stamps it on its own scripts.
 *
 * Pages whose HTML is prerendered (the landing page, the blog, the legal
 * pages: decision 10.4 keeps them static) are served from cache and cannot
 * carry a per-request nonce, so they get the same policy with
 * `'unsafe-inline'` scripts instead. Their HTML is fixed at build time, with
 * nothing from the request or a tenant in it. Everything else still applies
 * there: no eval, no plugins, no <base>, no framing, no scripts from unlisted
 * hosts, and nowhere unlisted to send data.
 *
 * Edge-safe: no Node APIs, the middleware runs it.
 */
interface ContentSecurityPolicyOptions {
  /** Per-request nonce. Without one, scripts fall back to 'unsafe-inline'. */
  nonce?: string;

  /**
   * The API the browser calls directly (uploads to it in dev), and Socket.IO's
   * host: the socket runs on the API itself, so its ws(s) twin is listed too.
   */
  apiOrigin?: string;

  /** Where presigned uploads go and signed files come from. */
  storageOrigins?: string[];

  /**
   * The base map's tile hosts (decision 7.4): the provider read from
   * MAP_TILE_URL at request time, or public OSM in development only. Every
   * map (tower, route page, location picker) draws from the same setting,
   * so no tile host is listed by default.
   */
  mapTileOrigins?: string[];

  /** Development: React Refresh and webpack's eval'd modules need eval. */
  dev?: boolean;
}

/** The private R2 bucket the API presigns uploads and downloads for. */
const DEFAULT_STORAGE_ORIGINS = ["https://*.r2.cloudflarestorage.com"];

const TURNSTILE = "https://challenges.cloudflare.com";

/**
 * Cloudflare Web Analytics: the edge in front of the site injects its script
 * (stamping the page's nonce when there is one). The prerendered pages have
 * no nonce, so the host must be listed for them; the beacon reports to
 * /cdn-cgi/rum on this origin ('self'). Cookieless, disclosed in
 * /legal/privacidade.
 */
const CLOUDFLARE_WEB_ANALYTICS = "https://static.cloudflareinsights.com";

/** Origin of a URL, or nothing when it is not one. */
function originOf(value: string | undefined): string | undefined {
  if (!value) return undefined;

  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

/** The WebSocket twin of an http(s) origin, for Socket.IO's upgrade. */
function socketOriginOf(origin: string | undefined): string | undefined {
  if (!origin) return undefined;

  return origin.replace(/^http(s?):/, "ws$1:");
}

/** A fresh nonce: a v4 UUID's 122 random bits, base64 like the CSP grammar asks. */
export function createNonce(): string {
  return btoa(crypto.randomUUID());
}

/** Storage origins from a comma-separated setting, or the default bucket. */
export function parseStorageOrigins(value: string | undefined): string[] {
  const origins = (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : DEFAULT_STORAGE_ORIGINS;
}

export function buildContentSecurityPolicy({
  nonce,
  apiOrigin,
  storageOrigins = DEFAULT_STORAGE_ORIGINS,
  mapTileOrigins = [],
  dev = false,
}: ContentSecurityPolicyOptions = {}): string {
  const api = originOf(apiOrigin);
  const socket = socketOriginOf(api);

  const list = (...sources: Array<string | undefined | false>) =>
    sources.filter(Boolean).join(" ");

  // With a nonce, 'strict-dynamic' lets the scripts Next loads (and the
  // Turnstile widget the login page injects) run, while any markup an
  // attacker gets into the page does not. The host entries are the fallback
  // for browsers without CSP3.
  //
  // The theme script's hash rides only with the nonce: a hash or a nonce in
  // the list makes browsers ignore 'unsafe-inline', which the prerendered
  // variant depends on.
  const scripts = nonce
    ? list(
        "'self'",
        `'nonce-${nonce}'`,
        "'strict-dynamic'",
        THEME_INIT_SCRIPT_HASH,
        TURNSTILE,
        CLOUDFLARE_WEB_ANALYTICS,
      )
    : list("'self'", "'unsafe-inline'", TURNSTILE, CLOUDFLARE_WEB_ANALYTICS);

  const directives: Array<[string, string]> = [
    ["default-src", "'self'"],
    ["script-src", list(scripts, dev && "'unsafe-eval'")],

    // Radix and Leaflet position things with inline styles.
    ["style-src", "'self' 'unsafe-inline'"],

    [
      "img-src",
      list(
        "'self'",
        "data:",
        "blob:",
        ...mapTileOrigins,
        api,
        ...storageOrigins,
      ),
    ],
    ["media-src", list("'self'", "blob:", api, ...storageOrigins)],
    ["font-src", "'self' data:"],
    [
      "connect-src",
      list(
        "'self'",
        api,
        socket,
        ...storageOrigins,
        TURNSTILE,
        "https://nominatim.openstreetmap.org",
        "https://viacep.com.br",
        dev && "ws:",
      ),
    ],
    ["frame-src", TURNSTILE],
    ["worker-src", "'self' blob:"],
    ["object-src", "'none'"],
    ["base-uri", "'self'"],
    // Nothing frames this app, not even itself: clickjacking needs a frame.
    ["frame-ancestors", "'none'"],
    ["form-action", "'self'"],
    ...reportingDirectives(),
  ];

  return directives.map(([name, value]) => `${name} ${value}`).join("; ");
}

/** Where browsers send violations (src/app/api/csp-report/route.ts). */
const CSP_REPORT_PATH = "/api/csp-report";

/** The Reporting API name of that endpoint, declared by `Reporting-Endpoints`. */
const CSP_REPORT_GROUP = "csp-endpoint";

const REPORTING_ENDPOINTS_HEADER = "Reporting-Endpoints";

/**
 * Both reporting directives: `report-to` for browsers with the Reporting API
 * (which then ignore `report-uri`), `report-uri` for the rest. The endpoint
 * reads both formats.
 */
function reportingDirectives(): Array<[string, string]> {
  return [
    ["report-uri", CSP_REPORT_PATH],
    ["report-to", CSP_REPORT_GROUP],
  ];
}

/** The `Reporting-Endpoints` value that names the group `report-to` uses. */
function reportingEndpoints(): string {
  return `${CSP_REPORT_GROUP}="${CSP_REPORT_PATH}"`;
}

/**
 * Trusted Types, step 1: Report-Only, sent next to the enforced policy.
 *
 * Every DOM sink that turns a string into script (innerHTML, script.src,
 * eval…) is reported unless the value went through a named policy. Needs no
 * nonce, so it rides on prerendered pages too. The names are the ones Next
 * creates: `nextjs#bundler` is webpack's chunk loader
 * (next/dist/build/webpack-config.js) and `nextjs` its client helper
 * (next/dist/client/trusted-types.js); `default` is the slot a future
 * enforcement step may fill. Nothing is blocked: the reports say what would
 * break before anything is enforced.
 */
const TRUSTED_TYPES_REPORT_ONLY_POLICY = [
  ["require-trusted-types-for", "'script'"],
  ["trusted-types", "nextjs nextjs#bundler default"],
  ...reportingDirectives(),
]
  .map(([name, value]) => `${name} ${value}`)
  .join("; ");

export {
  CSP_REPORT_GROUP,
  CSP_REPORT_PATH,
  REPORTING_ENDPOINTS_HEADER,
  TRUSTED_TYPES_REPORT_ONLY_POLICY,
  reportingEndpoints,
};

/** The sign-in pages: rendered per request ((auth)/layout.tsx is force-dynamic). */
const AUTH_PATHS = new Set([
  "/login",
  "/forgot",
  "/forgot/password",
  "/new-verification",
]);

/** Prefixes whose every page renders per request (cookies or force-dynamic). */
const PER_REQUEST_PREFIXES = [
  "/dashboard",
  "/admin",
  "/profile",
  "/notifications",
  "/driver",
  "/acompanhar/",
  "/verificar",
  "/docs",
];

/**
 * Whether the page at `pathname` is rendered per request, and so can carry
 * the nonce Next stamps on its scripts. A page wrongly listed here would be
 * served from cache with un-nonced scripts and blocked whole by the enforced
 * policy, so the list is positive: an unknown path gets the prerendered
 * variant. tests/unitaires/csp-per-request-pages.test.ts checks every page
 * file under these prefixes is in fact dynamic.
 */
export function rendersPerRequest(pathname: string): boolean {
  if (AUTH_PATHS.has(pathname)) return true;

  return PER_REQUEST_PREFIXES.some((prefix) =>
    prefix.endsWith("/")
      ? pathname.startsWith(prefix)
      : pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
