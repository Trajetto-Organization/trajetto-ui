import { NextRequest, NextResponse } from "next/server";
import { parseJwt } from "./lib/decode-jwt";
import { apiForwardingHeaders } from "./lib/api-forwarding";
import { createSingleFlight } from "./lib/single-flight";
import { sessionCookieOptions } from "./lib/session-cookie-options";
import {
  REPORTING_ENDPOINTS_HEADER,
  TRUSTED_TYPES_REPORT_ONLY_POLICY,
  buildContentSecurityPolicy,
  createNonce,
  parseStorageOrigins,
  reportingEndpoints,
  rendersPerRequest,
} from "./lib/content-security-policy";
import {
  RENEWAL_PENDING,
  SESSION_RENEWAL_HEADER,
  refreshAnswerEndsSession,
} from "./lib/session-renewal";
import { appEnv, isIndexable } from "./lib/site";
import {
  OSM_TILES,
  OSM_TILE_ORIGIN,
  resolveMapTiles,
  tileOriginForCsp,
} from "./features/control-tower/lib/map-tiles";
import { PUBLIC_ENV } from "./env/names";
import {
  accessDeniedRedirect,
  findAppRoute,
  isDriverOnlyPath,
  isDriverSurface,
} from "./lib/route-access";
import { refreshRefusalReason } from "./app/(protected)/_components/layout/shared/session-refusal";

interface RefreshUserSessionProps {
  refresh_token: string;
  token: string;
}

const AUTH_ROUTES = [
  "/login",
  "/forgot",
  "/forgot/password",
  "/new-verification",
];

/**
 * How long a navigation waits for the token renewal. The whole request is
 * held while it runs, and an answer this late is the API in trouble: the page
 * then shows the reconnection screen (renewal pending), never a logout.
 */
const REFRESH_TIMEOUT_MS = 3_000;

const PRIVATE_PREFIXES = [
  "/dashboard",
  "/admin",
  "/profile",
  "/notifications",
  "/driver",
];

function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * A speculative fetch: the router's prefetch of a link (`Next-Router-Prefetch`
 * on the "auto" kind every <Link> uses) or the browser's own (`Purpose` /
 * `Sec-Purpose: prefetch`). Nobody is waiting on it, and a page full of links
 * whose token just expired would each POST the same refresh token.
 */
function isPrefetch(req: NextRequest): boolean {
  if (req.headers.has("next-router-prefetch")) return true;

  const purpose = `${req.headers.get("purpose") ?? ""} ${req.headers.get("sec-purpose") ?? ""}`;

  return /\bprefetch\b/i.test(purpose);
}

/**
 * Where an expired access token is worth renewing: the authenticated area
 * (its pages, RSC navigations and the Server Actions posted to them), the
 * sign-in pages (a dead session is cleared there instead of bouncing the
 * person to a dashboard that would log them out), and the relay the browser
 * reads through. Never a public page: a visitor with old cookies browsing the
 * site cost one API refresh per page, and a refused one answered their form
 * POST (the quote, the tracking opt-out) with a redirect to the login.
 */
function needsLiveSession(pathname: string): boolean {
  return (
    isPrivatePath(pathname) ||
    AUTH_ROUTES.includes(pathname) ||
    pathname.startsWith("/api/relay/")
  );
}

/**
 * Whether the browser says this request comes from the app itself.
 *
 * `force_logout=true` revokes the session on the API and deletes the
 * cookies. The app only ever reaches it from its own pages (the protected
 * layout's redirect, `forceLogout`), so a link on another site that does the
 * same is refused: Fetch Metadata says `same-origin` for the app's own
 * navigations and redirects, `none` for one the person typed or bookmarked.
 */
function isOwnNavigation(req: NextRequest): boolean {
  const site = req.headers.get("sec-fetch-site");

  return site === "same-origin" || site === "none";
}

/**
 * The browser-facing hosts for the policy, from the same variables the
 * public configuration reads (src/env/public-config.ts). Read per request:
 * the edge sandbox copies the server's environment at run time, and these
 * names carry no NEXT_PUBLIC_ prefix, so the build cannot inline them and
 * the image promoted from staging answers with production's hosts.
 *
 * Lenient on purpose: the boot check (src/instrumentation.ts) already
 * refused a broken environment, and one bad value here must not drop the
 * others from the policy. A tile setting the maps refuse adds nothing.
 */
function publicHosts(): {
  apiOrigin?: string;
  mapTileOrigins: string[];
} {
  const env = process.env;
  const tiles = resolveMapTiles({
    url: env[PUBLIC_ENV.mapTileUrl],
    attribution: null,
    darkUrl: env[PUBLIC_ENV.mapTileUrlDark],
    appEnv: appEnv(),
  });
  const tileOrigin =
    tiles?.url === OSM_TILES.url
      ? OSM_TILE_ORIGIN
      : tiles && tileOriginForCsp(tiles.url);
  // The dark style (MAP_TILE_URL_DARK) may come from another host.
  const darkOrigin = tiles?.dark ? tileOriginForCsp(tiles.dark.url) : null;

  return {
    apiOrigin: env[PUBLIC_ENV.apiUrl]?.trim(),
    mapTileOrigins: [
      ...new Set([tileOrigin, darkOrigin].filter((o): o is string => !!o)),
    ],
  };
}

/**
 * Staging and local servers are never indexed, whatever a page's metadata
 * says. Decided here, per request: next.config headers are fixed at build,
 * and the one image built is promoted from staging to production (12.2).
 */
function withIndexingPolicy(response: NextResponse): NextResponse {
  if (!isIndexable()) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return response;
}

export default async function middleware(req: NextRequest) {
  return withIndexingPolicy(await route(req));
}

async function route(req: NextRequest): Promise<NextResponse> {
  const accessToken = req.cookies.get("tkey")?.value;
  const refreshToken = req.cookies.get("rkey")?.value;

  const pathname = req.nextUrl.pathname;
  let decodeJwt = accessToken ? parseJwt(accessToken) : null;

  // ============================================
  // 0. FORCE LOGOUT (from ProtectedProvider security checks)
  // Redirects to /login?reason=errorType for toast display
  // ============================================
  const forceLogoutRequested =
    req.nextUrl.searchParams.get("force_logout") === "true";

  if (forceLogoutRequested && isOwnNavigation(req)) {
    const errorType =
      req.nextUrl.searchParams.get("error") || "session_expired";

    // Deleting the cookies alone leaves the refresh-token family valid on
    // the API: revoke it while the access token still identifies it.
    if (accessToken) await revokeApiSession(req, accessToken);

    return handleLogout(req, errorType);
  }

  // Headers handed to the page, not to the browser. A client-sent copy of the
  // renewal flag is dropped: only this middleware may say a renewal is pending.
  const forwardedHeaders = new Headers(req.headers);
  forwardedHeaders.delete(SESSION_RENEWAL_HEADER);

  // ============================================
  // 1. ROUTE CLASSIFICATION
  // ============================================
  const isPrivateRoute = isPrivatePath(pathname);

  // ============================================
  // 2. TOKEN REFRESH (before any access decision)
  // ============================================
  const tokenExpired = Boolean(
    decodeJwt && refreshToken && decodeJwt.exp < Date.now() / 1000,
  );

  if (tokenExpired && isPrivateRoute && isPrefetch(req)) {
    // Not renewed here, and not rendered with the expired token either: the
    // layout would read its 401 as a verdict and the router would keep that
    // render. A non-RSC answer makes the router fall back to a full
    // navigation when the link is actually clicked, and that request renews.
    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  }

  if (tokenExpired && needsLiveSession(pathname) && !isPrefetch(req)) {
    const renewal = await renewSessionOnce(refreshToken!, () =>
      renewSession(req, refreshToken!),
    );

    if (renewal.kind === "refused") {
      // The refresh runs the session eligibility check too: a company
      // switched off or a revoked user is said as such, not as an expired
      // session.
      return handleLogout(req, renewal.reason);
    }

    if (renewal.kind === "renewed") {
      // Redirect to same page with fresh cookies. Same attributes as the
      // login sets: both live as long as the new refresh token, so a
      // refreshed session and a fresh one behave alike.
      const response = NextResponse.redirect(new URL(req.url));
      const cookieOptions = sessionCookieOptions(renewal.refreshToken);

      response.cookies.set("tkey", renewal.token, cookieOptions);
      response.cookies.set("rkey", renewal.refreshToken, cookieOptions);

      return response;
    }

    // Busy, failing, slow or unreachable: keep the session and carry on with
    // the expired token. The layout sees the flag and shows the reconnection
    // screen instead of reading the expired token's 401 as a verdict; the
    // next navigation tries the refresh again.
    forwardedHeaders.set(SESSION_RENEWAL_HEADER, RENEWAL_PENDING);
  }

  const userRole = decodeJwt?.role || "";
  const driverId = decodeJwt?.driverId || null;

  // ============================================
  // 3. PUBLIC ROUTES - redirect authenticated users away from login
  // ============================================
  // Not with a force_logout the browser did not vouch for (step 0): bouncing
  // that request to the dashboard would loop through the layout's own
  // redirect back here. The sign-in page renders instead.
  if (!isPrivateRoute && accessToken && !forceLogoutRequested) {
    if (AUTH_ROUTES.includes(pathname)) {
      let redirectPath = "/dashboard";

      if (userRole.startsWith("MASTER")) {
        redirectPath = "/admin";
      } else if (userRole === "BUSINESS_USER" && driverId) {
        redirectPath = "/profile";
      }

      return NextResponse.redirect(new URL(redirectPath, req.url));
    }
  }

  // ============================================
  // 4. PRIVATE ROUTES - require authentication
  // ============================================
  if (isPrivateRoute && !accessToken) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // ============================================
  // 5. ROLE-BASED ROUTING (from JWT only, zero API calls)
  // ============================================
  if (isPrivateRoute && accessToken) {
    // MASTER cannot access /dashboard
    if (pathname.startsWith("/dashboard") && userRole.startsWith("MASTER")) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    // Non-MASTER cannot access /admin
    if (pathname.startsWith("/admin") && !userRole.startsWith("MASTER")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Non-drivers cannot access /driver routes: the same segment-aware rule
    // canAccessPath applies, so no menu offers them what this line bounces.
    if (isDriverOnlyPath(pathname) && !driverId) {
      const redirectPath = userRole.startsWith("MASTER")
        ? "/admin"
        : "/dashboard";

      return NextResponse.redirect(new URL(redirectPath, req.url));
    }

    // Pages restricted by role (the API's verifyUserRole), read from the
    // route registry — the same rule the menus and ⌘K apply, so none of
    // them offers a page this line would bounce.
    const allowedRoles = findAppRoute(pathname)?.allowedRoles;

    if (
      allowedRoles &&
      !allowedRoles.includes(userRole as (typeof allowedRoles)[number])
    ) {
      return NextResponse.redirect(
        new URL(
          accessDeniedRedirect(
            userRole as (typeof allowedRoles)[number],
            Boolean(driverId),
          ),
          req.url,
        ),
      );
    }

    // Drivers can only access /profile, /notifications, /driver — on a
    // segment boundary, the same function the menus ask.
    if (userRole === "BUSINESS_USER" && driverId) {
      if (!isDriverSurface(pathname)) {
        return NextResponse.redirect(new URL("/profile", req.url));
      }
    }
  }

  // ============================================
  // 6. FORWARD PATHNAME (for ProtectedProvider permission check)
  // ============================================
  // On the REQUEST, which is what `headers()` reads in the page. A header set
  // on the middleware RESPONSE goes to the browser and never reaches the
  // Server Components behind it.
  forwardedHeaders.set("x-pathname", pathname);

  // ============================================
  // 7. CONTENT-SECURITY-POLICY (enforced)
  // ============================================
  // A nonce only where the HTML is rendered per request (the authenticated
  // area, the sign-in pages, the public tracking, proof and developer pages).
  // Prerendered pages are served from cache with no nonce in their scripts,
  // so they get the 'unsafe-inline' variant (src/lib/content-security-policy.ts).
  const nonce = rendersPerRequest(pathname) ? createNonce() : undefined;

  const contentSecurityPolicy = buildContentSecurityPolicy({
    nonce,
    ...publicHosts(),
    storageOrigins: parseStorageOrigins(process.env.CSP_STORAGE_ORIGINS),
    dev: process.env.NODE_ENV === "development",
  });

  // On the REQUEST too: Next takes the nonce from the page request's CSP
  // header and stamps it on its own inline scripts. Any copy the browser sent
  // itself is replaced, like the renewal flag above, so a client cannot pick
  // the nonce Next stamps.
  forwardedHeaders.delete("content-security-policy-report-only");
  forwardedHeaders.delete("x-nonce");
  forwardedHeaders.set("content-security-policy", contentSecurityPolicy);

  if (nonce) forwardedHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: forwardedHeaders },
  });
  response.headers.set("x-pathname", pathname);
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);

  // Trusted Types, observed before enforced: reports what would break, blocks
  // nothing. Response only — Next reads the nonce from the request's CSP
  // headers, and this policy has none to give.
  response.headers.set(
    "Content-Security-Policy-Report-Only",
    TRUSTED_TYPES_REPORT_ONLY_POLICY,
  );
  response.headers.set(REPORTING_ENDPOINTS_HEADER, reportingEndpoints());

  return response;
}

type SessionRenewal =
  | { kind: "renewed"; token: string; refreshToken: string }
  | { kind: "refused"; reason: string }
  | { kind: "unavailable" };

/**
 * The requests of one page racing to renew the same session share a single
 * POST /user/refresh-token (see lib/single-flight.ts): the API reads too many
 * presentations of one refresh token as theft. An "unavailable" answer is not
 * kept, so the next request tries again.
 */
const renewSessionOnce = createSingleFlight<SessionRenewal>({
  keepMs: 10_000,
  maxEntries: 5_000,
  keep: (renewal) => renewal.kind !== "unavailable",
});

/**
 * POST /user/refresh-token, bounded. Only an answer from the API that says no
 * ends the session; a timeout, a dropped connection, a 429 or a 5xx — or a
 * 200 whose body never arrives whole — is "unavailable", which keeps it.
 */
async function renewSession(
  req: NextRequest,
  refreshToken: string,
): Promise<SessionRenewal> {
  try {
    const response = await fetch(
      `${process.env.HTTP_REQUEST}/user/refresh-token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Anonymous route limited per address: say which browser this is
          // for, or every web user shares this server's budget.
          ...apiForwardingHeaders(req.headers),
        },
        body: JSON.stringify({ token: refreshToken }),
        cache: "no-store",
        signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS),
      },
    );

    if (!response.ok) {
      if (!refreshAnswerEndsSession(response.status)) {
        return { kind: "unavailable" };
      }

      const body: unknown = await response.json().catch(() => null);

      return {
        kind: "refused",
        reason: refreshRefusalReason(response.status, body),
      };
    }

    const { token, refresh_token } =
      (await response.json()) as RefreshUserSessionProps;

    if (typeof token !== "string" || typeof refresh_token !== "string") {
      return { kind: "unavailable" };
    }

    return { kind: "renewed", token, refreshToken: refresh_token };
  } catch {
    // The API did not answer in time, or at all. That says nothing about the
    // session.
    return { kind: "unavailable" };
  }
}

const REVOKE_TIMEOUT_MS = 3_000;

/**
 * POST /user/logout for the forced-logout path (security checks, the
 * unconfirmed "Sair" fallback). Best effort and bounded: an API that is down
 * or a token already expired must not keep the browser signed in.
 */
async function revokeApiSession(
  req: NextRequest,
  accessToken: string,
): Promise<void> {
  try {
    await fetch(`${process.env.HTTP_REQUEST}/user/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...apiForwardingHeaders(req.headers),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(REVOKE_TIMEOUT_MS),
    });
  } catch {
    // Unreachable or timed out: the cookies still go.
  }
}

const handleLogout = (req: NextRequest, errorType: string) => {
  const url = new URL("/login", req.url);
  url.searchParams.set("reason", errorType);

  const response = NextResponse.redirect(url);

  response.cookies.delete("tkey");
  response.cookies.delete("rkey");

  return response;
};

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
