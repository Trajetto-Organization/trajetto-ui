import { NextRequest, NextResponse } from "next/server";
import { parseJwt } from "./lib/decode-jwt";
import { apiForwardingHeaders } from "./lib/api-forwarding";
import { sessionCookieOptions } from "./lib/session-cookie-options";
import {
  buildContentSecurityPolicy,
  createNonce,
  parseStorageOrigins,
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
  if (req.nextUrl.searchParams.get("force_logout") === "true") {
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
  // 1. TOKEN REFRESH (runs FIRST, before anything)
  // ============================================
  if (decodeJwt && refreshToken) {
    const currentTime = Date.now() / 1000;
    if (decodeJwt.exp < currentTime) {
      let refreshResponse: Response | null = null;

      try {
        refreshResponse = await fetch(
          `${process.env.HTTP_REQUEST}/user/refresh-token`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              // Anonymous route limited per address: say which browser this
              // is for, or every web user shares this server's budget.
              ...apiForwardingHeaders(req.headers),
            },
            body: JSON.stringify({ token: refreshToken }),
          },
        );
      } catch {
        // The API did not answer. That says nothing about the session.
        refreshResponse = null;
      }

      if (refreshResponse && !refreshResponse.ok) {
        if (refreshAnswerEndsSession(refreshResponse.status)) {
          // The refresh runs the session eligibility check too: a company
          // switched off or a revoked user is said as such, not as an
          // expired session.
          const body: unknown = await refreshResponse.json().catch(() => null);

          return handleLogout(
            req,
            refreshRefusalReason(refreshResponse.status, body),
          );
        }
      }

      if (!refreshResponse || !refreshResponse.ok) {
        // Busy, failing or unreachable: keep the session and carry on with
        // the expired token. The layout sees the flag and shows the
        // reconnection screen instead of reading the expired token's 401 as
        // a verdict; the next navigation tries the refresh again.
        forwardedHeaders.set(SESSION_RENEWAL_HEADER, RENEWAL_PENDING);
      } else {
        const { token, refresh_token } =
          (await refreshResponse.json()) as RefreshUserSessionProps;

        // Redirect to same page with fresh cookies. Same attributes as the
        // login sets: both live as long as the new refresh token, so a
        // refreshed session and a fresh one behave alike.
        const response = NextResponse.redirect(new URL(req.url));
        const cookieOptions = sessionCookieOptions(refresh_token);

        response.cookies.set("tkey", token, cookieOptions);
        response.cookies.set("rkey", refresh_token, cookieOptions);

        return response;
      }
    }
  }

  const userRole = decodeJwt?.role || "";
  const driverId = decodeJwt?.driverId || null;

  // ============================================
  // 2. ROUTE CLASSIFICATION
  // ============================================
  const isPrivateRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/driver");

  // ============================================
  // 3. PUBLIC ROUTES - redirect authenticated users away from login
  // ============================================
  if (!isPrivateRoute && accessToken) {
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

  return response;
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
