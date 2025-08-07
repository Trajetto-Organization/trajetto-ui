import { NextRequest, NextResponse } from "next/server";
import { parseJwt } from "./lib/decode-jwt";

import { Permission, PermissionKey } from "./app/(protected)/_components/dto";
import { appRoutes } from "./app/app-routes";

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

const PRIVATE_ROUTES = {
  dashboard: "/dashboard",
  admin: "/admin",
  profile: "/profile",
  notifications: "/notifications",
};

const PAGE_PERMISSIONS: Record<string, PermissionKey> = {};
appRoutes.forEach((route) => {
  if (route.requiredPermission) {
    PAGE_PERMISSIONS[route.path] = route.requiredPermission;
  }
});

export default async function middleware(req: NextRequest) {
  const accessToken = req.cookies.get("tkey")?.value; // Access Token
  const refreshToken = req.cookies.get("rkey")?.value; // Refresh token

  const pathname = req.nextUrl.pathname;

  const decodeJwt = accessToken ? parseJwt(accessToken) : null;
  const userRole = decodeJwt?.role || "";

  // Checks if the route is private, using the defined prefixes
  const isDashboard = pathname.startsWith(PRIVATE_ROUTES.dashboard);
  const isAdmin = pathname.startsWith(PRIVATE_ROUTES.admin);

  const isProfile = pathname.startsWith(PRIVATE_ROUTES.profile);

  const isPrivateRoute = isDashboard || isAdmin || isProfile;
  const isPublicRoute = !isPrivateRoute;

  // If it is on a public route and authenticated, redirect if it is an authentication route
  if (isPublicRoute && accessToken) {
    if (AUTH_ROUTES.includes(pathname)) {
      const redirectPath = userRole.startsWith("MASTER")
        ? "/admin"
        : "/dashboard";

      return NextResponse.redirect(new URL(redirectPath, req.url));
    }
  }

  // Access restrictions:
  // - MASTER users cannot access /dashboard
  if (isDashboard && userRole.startsWith("MASTER")) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  // - Non-MASTER users cannot access /admin
  if (isAdmin && !userRole.startsWith("MASTER")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // If it is a private route and you are not authenticated, it redirects to login
  if (isPrivateRoute && !accessToken) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isPrivateRoute && accessToken) {
    try {
      // Make a lightweight request to verify user exists
      const userCheckResponse = await fetch(
        `${process.env.HTTP_REQUEST}/user/me`,
        {
          credentials: "include",
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      const { user } = await userCheckResponse.json();

      if (user.access_revoked) {
        return await handleLogout(req, "user_revoked");
      }

      // GENERAL CHECK FOR BUSINESS_USER USERS:
      // If the user is BUSINESS_USER, he must have an access profile and a permissions array filled in.
      if (userRole === "BUSINESS_USER") {
        if (
          !user.profileAccess ||
          !user.profileAccess.permissions ||
          user.profileAccess.permissions.length === 0
        ) {
          return handleLogout(req, "no_user_permission");
        }
      }

      // SPECIFIC CHECK FOR PAGES REQUIRING PERMISSION
      const requiredPermission = PAGE_PERMISSIONS[pathname];
      if (requiredPermission) {
        // If the user is BUSINESS_USER, it must have the required permission.
        if (userRole === "BUSINESS_USER") {
          const hasPermission = user.profileAccess.permissions.some(
            (perm: Permission) => perm.permissionKey === requiredPermission,
          );

          if (!hasPermission) {
            return NextResponse.redirect(new URL("/dashboard", req.url));
          }
        }
      }

      // If user doesn't exist (404) or unauthorized (401), log them out
      if (
        userCheckResponse.status === 404 ||
        userCheckResponse.status === 401
      ) {
        return handleLogout(req, "user_deleted");
      }
    } catch (error) {
      return await handleLogout(req, "session_not_renewed");
    }
  }

  // Check token expiration and try to renew it
  const currentTime = Date.now() / 1000;
  if (decodeJwt && decodeJwt.exp < currentTime) {
    try {
      const refreshUserTokenRoute = `${process.env.HTTP_REQUEST}/user/refresh-token`;
      const refreshUserToken = await fetch(refreshUserTokenRoute, {
        credentials: "include",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: refreshToken }),
      });

      if (!refreshUserToken.ok) {
        return await handleLogout(req, "session_expired");
      }

      const { token, refresh_token } =
        (await refreshUserToken.json()) as RefreshUserSessionProps;

      const updateCookie = NextResponse.redirect(new URL(req.url));

      updateCookie.cookies.set("tkey", token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
      });

      updateCookie.cookies.set("rkey", refresh_token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
      });

      return updateCookie;
    } catch (error) {
      return await handleLogout(req, "session_not_renewed");
    }
  }

  return NextResponse.next();
}

// Function to log out the user and redirect to login
const handleLogout = async (req: NextRequest, errorType: string) => {
  const response = NextResponse.redirect(
    new URL(`/login?error=${errorType}`, req.url),
  );

  response.cookies.delete("tkey");
  response.cookies.delete("rkey");

  response.cookies.set({
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    name: errorType,
    value: "true",
    path: "/",
  });

  return response;
};

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
