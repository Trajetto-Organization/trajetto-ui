import { redirect } from "next/navigation";

import type { ValidateUserAccessParams } from "./protected-provider.types";
import { accessDeniedRedirect, canAccessPath } from "@/lib/route-access";

async function handleUserResponseError(response: Response) {
  if (response.status === 401) {
    redirect("/login?error=session_expired&force_logout=true");
  }

  if (response.status === 403) {
    const errorData = await response.json();
    const errorMessage = errorData.message || "";

    if (errorMessage.includes("acesso foi revogado")) {
      redirect("/login?error=user_revoked&force_logout=true");
    }

    if (errorMessage.includes("motorista está inativo")) {
      redirect("/login?error=driver_inactive&force_logout=true");
    }
  }

  if (response.status === 404) {
    redirect("/login?error=access_denied&force_logout=true");
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
    permissions: user.profileAccess?.permissions?.map(
      (permission) => permission.permissionKey,
    ),
    enabledModules,
    isDriver,
  });

  if (!allowed) {
    redirect(accessDeniedRedirect(user.role, isDriver));
  }
}

export { handleUserResponseError, validateUserAccess };
