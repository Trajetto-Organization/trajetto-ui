import { NextRequest, NextResponse } from "next/server";
import { parseJwt } from "./lib/decode-jwt";

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

export default async function middleware(req: NextRequest) {
  const accessToken = req.cookies.get("tkey")?.value;
  const refreshToken = req.cookies.get("rkey")?.value;

  const pathname = req.nextUrl.pathname;
  let decodeJwt = accessToken ? parseJwt(accessToken) : null;

  // ============================================
  // 0. FORCE LOGOUT (from ProtectedProvider security checks)
  // Deletes cookies and redirects to clean login URL
  // ============================================
  if (req.nextUrl.searchParams.get("force_logout") === "true") {
    const cleanUrl = new URL(req.url);
    cleanUrl.searchParams.delete("force_logout");

    const response = NextResponse.redirect(cleanUrl);

    response.cookies.delete("tkey");
    response.cookies.delete("rkey");

    return response;
  }

  // ============================================
  // 1. TOKEN REFRESH (runs FIRST, before anything)
  // ============================================
  if (decodeJwt && refreshToken) {
    const currentTime = Date.now() / 1000;

    if (decodeJwt.exp < currentTime) {
      try {
        const refreshResponse = await fetch(
          `${process.env.HTTP_REQUEST}/user/refresh-token`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: refreshToken }),
          },
        );

        if (!refreshResponse.ok) {
          return handleLogout(req, "session_expired");
        }

        const { token, refresh_token } =
          (await refreshResponse.json()) as RefreshUserSessionProps;

        // Redirect to same page with fresh cookies
        const response = NextResponse.redirect(new URL(req.url));

        response.cookies.set("tkey", token, {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
        });

        response.cookies.set("rkey", refresh_token, {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
        });

        return response;
      } catch {
        return handleLogout(req, "session_not_renewed");
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

    // Non-drivers cannot access /driver routes
    if (pathname.startsWith("/driver") && !driverId) {
      const redirectPath = userRole.startsWith("MASTER")
        ? "/admin"
        : "/dashboard";

      return NextResponse.redirect(new URL(redirectPath, req.url));
    }

    // /dashboard/activity: Only BUSINESS_ADMIN
    if (
      pathname.startsWith("/dashboard/activity") &&
      userRole !== "BUSINESS_ADMIN"
    ) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Drivers can only access /profile, /notifications, /driver
    if (userRole === "BUSINESS_USER" && driverId) {
      const allowedPaths = ["/profile", "/notifications", "/driver"];
      const isAllowedPath = allowedPaths.some((path) =>
        pathname.startsWith(path),
      );

      if (!isAllowedPath) {
        return NextResponse.redirect(new URL("/profile", req.url));
      }
    }
  }

  // ============================================
  // 6. FORWARD PATHNAME (for ProtectedProvider permission check)
  // ============================================
  const response = NextResponse.next();
  response.headers.set("x-pathname", pathname);

  return response;
}

const handleLogout = (req: NextRequest, errorType: string) => {
  const response = NextResponse.redirect(
    new URL(`/login?error=${errorType}`, req.url),
  );

  response.cookies.delete("tkey");
  response.cookies.delete("rkey");

  return response;
};

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
