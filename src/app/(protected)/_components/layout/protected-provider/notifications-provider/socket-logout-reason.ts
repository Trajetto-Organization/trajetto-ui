import type { ForceLogoutReason } from "@/lib/force-logout";

/**
 * The API's socket vocabulary, translated to ours.
 *
 * They are not the same list on purpose: `user_updated` covers a handful of
 * profile changes on the backend but only ever means "your token is stale" to
 * us. The reasons below end a session the API already closed in the database
 * (a role, company or linked driver change, USR-EDIT-1; a company, a
 * driver's branch or the driver record switched off, decision 4.1; a
 * profile without permissions), so each one logs out with its own words
 * instead of depending on the re-check: a 401 there says "Sua sessão
 * expirou", and a 5xx or a timeout leaves the person on the connection
 * screen. Anything not mapped here is not a kick — it falls through to the
 * `/user/me` re-check, which decides with full information
 * (`permissions_changed` keeps the session there, decision 4.6).
 *
 * A Map, so a reason like "constructor" cannot resolve to something the
 * object prototype carries.
 */
const SOCKET_REASON_TO_LOGOUT: ReadonlyMap<string, ForceLogoutReason> = new Map<
  string,
  ForceLogoutReason
>([
  ["access_revoked", "user_revoked"],
  ["access_denied", "access_denied"],
  ["user_updated", "session_expired"],
  ["role_changed", "role_changed"],
  ["business_inactive", "business_inactive"],
  ["branch_inactive", "branch_inactive"],
  // update-driver and the socket sweep (AUTH_DRIVER_INACTIVE and
  // AUTH_DRIVER_TENANT_MISMATCH).
  ["driver_inactive", "driver_inactive"],
  // The socket sweep's AUTH_PROFILE_NOT_CONFIGURED, which the /user/me
  // re-check words the same way (session-refusal.ts).
  ["no_permissions", "no_user_permission"],
]);

function socketLogoutReason(reason: unknown): ForceLogoutReason | undefined {
  return typeof reason === "string"
    ? SOCKET_REASON_TO_LOGOUT.get(reason)
    : undefined;
}

/**
 * The API's logout use case announces "logout" to the session's own room:
 * "Sair" was pressed in another tab of this browser. Not a kick (no overlay,
 * no error): it leaves to the same "você saiu" instead of re-checking a
 * session that is gone. Through the middleware's force_logout, which deletes
 * the cookies itself: the event arrives while the other tab's action is
 * still answering, before its response deleted them, and a plain
 * /login?reason=logout bounced to /dashboard and then to a bare /login.
 */
const SESSION_LOGOUT_DESTINATION = "/login?force_logout=true&error=logout";

function isSessionLogoutEvent(event: unknown): boolean {
  return (
    typeof event === "object" &&
    event !== null &&
    (event as { reason?: unknown }).reason === "logout"
  );
}

export { SESSION_LOGOUT_DESTINATION, isSessionLogoutEvent, socketLogoutReason };
