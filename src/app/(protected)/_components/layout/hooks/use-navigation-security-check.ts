import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";

import { getCookies } from "@/actions/cookies";
import { disconnectSocket } from "@/socket";

import { parseJwt } from "@/lib/decode-jwt";

import { appRoutes } from "@/app/app-routes";
import { useAuthStore } from "@/store/auth-store";

import { Permission, PermissionKey } from "../../dto";

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
        disconnectSocket();

        if (response.status === 403) {
          const data = await response.json();
          const message = data.message || "";

          if (message.includes("acesso foi revogado")) {
            window.location.href =
              "/login?error=user_revoked&force_logout=true";
            return;
          }

          if (message.includes("motorista está inativo")) {
            window.location.href =
              "/login?error=driver_inactive&force_logout=true";
            return;
          }

          window.location.href = "/login?error=access_denied&force_logout=true";
          return;
        }

        if (response.status === 401) {
          window.location.href =
            "/login?error=session_expired&force_logout=true";
          return;
        }

        if (response.status === 404) {
          window.location.href = "/login?error=access_denied&force_logout=true";
          return;
        }

        return;
      }

      // ============================================
      // Response OK — deep security checks
      // ============================================
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
        disconnectSocket();
        window.location.href =
          "/login?error=permissions_changed&force_logout=true";

        return;
      }

      // BUSINESS_USER employee (not driver) must have profileAccess
      if (
        user.role === "BUSINESS_USER" &&
        !user.driverId &&
        (!user.profileAccess?.permissions ||
          user.profileAccess.permissions.length === 0)
      ) {
        disconnectSocket();
        window.location.href =
          "/login?error=no_user_permission&force_logout=true";

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
      // Network error — don't redirect, let user continue
    }
  }, []);

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
