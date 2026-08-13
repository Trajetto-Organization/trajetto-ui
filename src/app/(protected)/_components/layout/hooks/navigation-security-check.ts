import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";

import { getCookies } from "@/actions/cookies";

import { forceLogout } from "@/lib/force-logout";
import { useConnectionStore } from "@/lib/connection-status";

import { parseJwt } from "@/lib/decode-jwt";

import { appRoutes } from "@/app/app-routes";
import { useAuthStore } from "@/store/auth-store";

import type { Permission, PermissionKey } from "../../shared/common.types";

// Build page permissions map once at module level
const PAGE_PERMISSIONS: Record<string, PermissionKey> = {};
appRoutes.forEach((route) => {
  if (route.requiredPermission) {
    PAGE_PERMISSIONS[route.path] = route.requiredPermission;
  }
});

function useNavigationSecurityCheck() {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  const { setAuth } = useAuthStore();
  const setUnreachable = useConnectionStore((state) => state.setUnreachable);

  pathnameRef.current = pathname;

  const checkUserAccess = useCallback(async () => {
    try {
      const token = await getCookies("tkey");

      if (!token) {
        window.location.href = "/login";
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_HTTP_REQUEST}/user/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        if (response.status === 403) {
          const data = await response.json().catch(() => ({}));
          const message = data.message || "";

          if (message.includes("acesso foi revogado")) {
            forceLogout("user_revoked");
            return;
          }

          if (message.includes("motorista está inativo")) {
            forceLogout("driver_inactive");
            return;
          }

          forceLogout("access_denied");
          return;
        }

        if (response.status === 401) {
          forceLogout("session_expired");
          return;
        }

        if (response.status === 404) {
          forceLogout("access_denied");
          return;
        }

        // A 5xx is the API failing, not the API saying no. The session was
        // never judged, so it is not thrown away — the connection screen goes
        // up and keeps asking until there is a real answer.
        setUnreachable(true);
        return;
      }

      // ============================================
      // Response OK — deep security checks
      // ============================================
      // The API answered, so whatever the connection screen was waiting for
      // has happened. Cleared before the checks below, which may well end in a
      // logout — that is a real answer too.
      setUnreachable(false);

      const data = await response.json();
      const user = data?.user;

      if (!user) return;
      const decodedJwt = parseJwt(token);

      // Role changed or driver status changed
      const roleChanged = decodedJwt?.role !== user.role;
      const driverStatusChanged =
        (decodedJwt?.driverId === null && user.driverId !== null) ||
        (decodedJwt?.driverId !== null && user.driverId === null);

      if (roleChanged || driverStatusChanged) {
        forceLogout("permissions_changed");
        return;
      }

      // BUSINESS_USER employee (not driver) must have profileAccess
      if (
        user.role === "BUSINESS_USER" &&
        !user.driverId &&
        (!user.profileAccess?.permissions ||
          user.profileAccess.permissions.length === 0)
      ) {
        forceLogout("no_user_permission");
        return;
      }

      // Page-level permission check for BUSINESS_USER employees
      const currentPathname = pathnameRef.current;
      if (currentPathname && user.role === "BUSINESS_USER" && !user.driverId) {
        const requiredPermission = Object.entries(PAGE_PERMISSIONS).find(
          ([path]) =>
            currentPathname === path || currentPathname.startsWith(`${path}/`),
        )?.[1];

        if (requiredPermission) {
          const hasPermission = user.profileAccess?.permissions?.some(
            (perm: Permission) => perm.permissionKey === requiredPermission,
          );

          if (!hasPermission) {
            window.location.href = "/dashboard";
            return;
          }
        }
      }

      // All checks passed — sync fresh permissions to auth store
      // This updates the sidebar in real-time when permissions change
      setAuth({
        id: user.id,
        businessId: user.businessId,
        role: user.role,
        permissions:
          user.profileAccess?.permissions?.map((perm: Permission) => ({
            permissionKey: perm.permissionKey,
            canRead: perm.canRead,
            canWrite: perm.canWrite,
          })) || [],
      });
    } catch {
      // Could not reach the API at all — container down, DNS, offline. Same
      // reasoning as the 5xx above: no answer is not a negative answer.
      setUnreachable(true);
    }
  }, [setAuth, setUnreachable]);

  // Listen for security events dispatched by NotificationsProvider
  // (Socket.IO securityAction events + reconnect)
  useEffect(() => {
    const handler = () => checkUserAccess();
    window.addEventListener("security-check-required", handler);

    return () => {
      window.removeEventListener("security-check-required", handler);
    };
  }, [checkUserAccess]);
}

export { useNavigationSecurityCheck };
