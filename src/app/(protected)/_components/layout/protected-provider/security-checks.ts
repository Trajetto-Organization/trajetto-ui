import { redirect } from "next/navigation";

import type { ValidateUserAccessParams } from "./protected-provider.types";
import {
  accessDeniedRedirect,
  canAccessPath,
  readablePermissionKeys,
} from "@/lib/route-access";

import { sessionRefusalReason } from "../shared/session-refusal";

/**
 * Turns the API's refusal of `/user/me` into a logout, by the error `code`.
 *
 * Matching on the message let every session-level 403 other than "revoked"
 * and "driver inactive" fall through to the connection screen — a deactivated
 * company or a removed profile looked like a lost connection that refreshed
 * forever. Returning now only means the API did not judge the session (5xx,
 * 429): the caller shows the connection screen.
 */
async function handleUserResponseError(response: Response) {
  const body: unknown = await response.json().catch(() => null);

  handleUserRefusal(response.status, body);
}

/** The same decision on an answer already read (session-access.ts). */
function handleUserRefusal(status: number, body: unknown) {
  const reason = sessionRefusalReason(status, body);

  if (reason) {
    redirect(`/login?error=${reason}&force_logout=true`);
  }
}

function validateUserAccess({
  user,
  jwtRole,
  jwtDriverId,
  pathname,
  enabledModules,
}: ValidateUserAccessParams) {
  // Critical changes that require re-authentication:
  // Role changed or driver status changed
  const roleChanged = jwtRole !== user.role;
  const driverStatusChanged =
    (jwtDriverId === null && user.driverId !== null) ||
    (jwtDriverId !== null && user.driverId === null);

  if (roleChanged || driverStatusChanged) {
    redirect("/login?error=permissions_changed&force_logout=true");
  }

  // BUSINESS_USER employee (not driver) must have profileAccess
  if (
    user.role === "BUSINESS_USER" &&
    !user.driverId &&
    (!user.profileAccess?.permissions ||
      user.profileAccess.permissions.length === 0)
  ) {
    redirect("/login?error=no_user_permission&force_logout=true");
  }

  // Page-level gate, run before anything renders: missing permission or a
  // module the company does not have both end the same way, as a redirect.
  //
  // Letting the page render and having the API answer 403 was the older
  // behaviour, and it read as a broken screen rather than as a boundary —
  // the same reason an employee never sees a page outside their profile.
  if (!pathname) return;

  const isDriver = Boolean(user.driverId);

  const allowed = canAccessPath(pathname, {
    role: user.role,
    permissions: readablePermissionKeys(user.profileAccess?.permissions),
    enabledModules,
    isDriver,
  });

  if (!allowed) {
    redirect(accessDeniedRedirect(user.role, isDriver));
  }
}

export { handleUserRefusal, handleUserResponseError, validateUserAccess };
