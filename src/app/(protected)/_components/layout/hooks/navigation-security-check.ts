import { useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";

import { readSessionClaims } from "@/actions/session";
import { relayUrl } from "@/lib/api-relay-paths";

import { forceLogout } from "@/lib/force-logout";
import { isSessionExiting } from "@/lib/clear-session-state";
import { useConnectionStore } from "@/lib/connection-status";

import { useAuthStore } from "@/store/auth-store";
import {
  accessDeniedRedirect,
  canAccessPath,
  readablePermissionKeys,
} from "@/lib/route-access";

import type { Permission } from "../../shared/common.types";

import { sessionRefusalReason } from "../shared/session-refusal";
import { accessSnapshotChanged } from "./access-snapshot";

/** A burst of socket events (one per replica, a reconnect) refreshes once. */
const SERVER_REFRESH_DEBOUNCE_MS = 300;

function useNavigationSecurityCheck() {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  const router = useRouter();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { setAuth } = useAuthStore();
  const setUnreachable = useConnectionStore((state) => state.setUnreachable);

  pathnameRef.current = pathname;

  /**
   * SSR-STALE-1. The store redraws the sidebar, ⌘K and buttons, but what the
   * SERVER rendered — the tabs Entregas shows, a "sem permissão" or "módulo
   * não contratado" state — stayed as it was until the next navigation. When
   * the access itself changed, the page is rendered again.
   */
  const scheduleServerRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);

    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null;
      router.refresh();
    }, SERVER_REFRESH_DEBOUNCE_MS);
  }, [router]);

  useEffect(
    () => () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    },
    [],
  );

  const checkUserAccess = useCallback(async () => {
    // This tab is logging out: there is no session left to re-check, and a
    // check now only races the logout's own navigation (clear-session-state).
    if (isSessionExiting()) return;

    try {
      // The session's claims (decoded on the server), then /user/me through
      // the same-origin relay: the page never holds the token itself.
      const claims = await readSessionClaims();

      if (isSessionExiting()) return;

      if (!claims) {
        window.location.href = "/login";
        return;
      }

      const response = await fetch(relayUrl("/user/me"), {
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        // Same reading as the server gate (security-checks.ts): by the error
        // code, not the message, which sent a deactivated company or a
        // removed profile to the generic "access_denied".
        const body: unknown = await response.json().catch(() => null);
        const reason = sessionRefusalReason(response.status, body);

        if (reason) {
          forceLogout(reason);
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
      // Role changed or driver status changed
      const roleChanged = claims.role !== user.role;
      const driverStatusChanged =
        (claims.driverId === null && user.driverId !== null) ||
        (claims.driverId !== null && user.driverId === null);

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

      // Page-level gate, re-evaluated whenever something moved: a revoked
      // permission and a module the master just switched off are the same
      // event from the page's point of view — you are standing somewhere you
      // no longer belong, so you leave.
      const currentPathname = pathnameRef.current;
      const enabledModules: string[] = user.enabledModules ?? [];

      const isDriver = Boolean(user.driverId);

      if (currentPathname) {
        const allowed = canAccessPath(currentPathname, {
          role: user.role,
          permissions: readablePermissionKeys(user.profileAccess?.permissions),
          enabledModules,
          isDriver,
        });

        if (!allowed) {
          window.location.href = accessDeniedRedirect(user.role, isDriver);
          return;
        }
      }

      const permissions =
        user.profileAccess?.permissions?.map((perm: Permission) => ({
          permissionKey: perm.permissionKey,
          canRead: perm.canRead,
          canWrite: perm.canWrite,
        })) || [];

      const previous = useAuthStore.getState();

      // All checks passed — sync fresh permissions and modules to the auth
      // store, which is what redraws the sidebar, the command bar and the
      // dashboard shortcuts without a reload.
      setAuth({
        id: user.id,
        businessId: user.businessId,
        role: user.role,
        permissions,
        enabledModules,
      });

      if (
        accessSnapshotChanged(
          {
            role: previous.role,
            permissions: previous.permissions,
            enabledModules: previous.enabledModules,
          },
          { role: user.role, permissions, enabledModules },
        )
      ) {
        scheduleServerRefresh();
      }
    } catch {
      // Could not reach the API at all — container down, DNS, offline. Same
      // reasoning as the 5xx above: no answer is not a negative answer.
      setUnreachable(true);
    }
  }, [setAuth, setUnreachable, scheduleServerRefresh]);

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
