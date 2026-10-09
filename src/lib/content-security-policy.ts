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

  /** The API the browser calls directly (Socket.IO, uploads to it in dev). */
  apiOrigin?: string;

  /** Socket.IO's host when it is not the API's (PUBLIC_SOCKET_URL). */
  socketOrigin?: string;

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
  socketOrigin,
  storageOrigins = DEFAULT_STORAGE_ORIGINS,
  mapTileOrigins = [],
  dev = false,
}: ContentSecurityPolicyOptions = {}): string {
  const api = originOf(apiOrigin);
  const socketHost = originOf(socketOrigin);
  const socket = socketOriginOf(api);
  const separateSocket =
    socketHost && socketHost !== api ? socketHost : undefined;

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
      )
    : list("'self'", "'unsafe-inline'", TURNSTILE);

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
        separateSocket,
        socketOriginOf(separateSocket),
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
    ["report-uri", "/api/csp-report"],
  ];

  return directives.map(([name, value]) => `${name} ${value}`).join("; ");
}

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
