import { redirect } from "next/navigation";

import { Permission, PermissionKey, UserLoggedProps } from "../../dto";
import { appRoutes } from "@/app/app-routes";

// Build page permissions map once at module level
const PAGE_PERMISSIONS: Record<string, PermissionKey> = {};
appRoutes.forEach((route) => {
  if (route.requiredPermission) {
    PAGE_PERMISSIONS[route.path] = route.requiredPermission;
  }
});

export async function handleUserResponseError(response: Response) {
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

interface ValidateUserAccessParams {
  user: UserLoggedProps["user"];
  jwtRole: string;
  jwtDriverId: string | null;
  pathname: string;
}

export function validateUserAccess({
  user,
  jwtRole,
  jwtDriverId,
  pathname,
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

  // Page-level permission check for BUSINESS_USER employees
  if (pathname && user.role === "BUSINESS_USER" && !user.driverId) {
    const requiredPermission = Object.entries(PAGE_PERMISSIONS).find(
      ([path]) => pathname === path || pathname.startsWith(`${path}/`),
    )?.[1];

    if (requiredPermission) {
      const hasPermission = user.profileAccess?.permissions?.some(
        (perm: Permission) => perm.permissionKey === requiredPermission,
      );

      if (!hasPermission) {
        redirect("/dashboard");
      }
    }
  }
}
