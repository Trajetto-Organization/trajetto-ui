import type { PermissionKey } from "@/lib/permissions";
import { getPermissionName } from "@/lib/permissions";

import { useAuthStore } from "../store/auth-store";

import { useEffect, useMemo } from "react";

interface RequiredPermission {
  key: PermissionKey;
  action: "read" | "write";
  label: string;
}

/**
 * Checks multiple permissions in a single hook
 */
function useCheckMultiplePermissions(
  requiredPermissions: RequiredPermission[],
) {
  // Use a single call to auth store
  const { role, permissions, loadAuth, isLoaded } = useAuthStore();

  // Load auth data if needed
  useEffect(() => {
    if (!isLoaded || role === null) {
      loadAuth();
    }
  }, [isLoaded, role, loadAuth]);

  // Process all permission checks in one go using useMemo
  return useMemo(() => {
    // Check individual permissions
    const permissionResults = requiredPermissions.map(
      ({ key, action, label }) => {
        let hasPermission = false;

        // Admin roles have all permissions
        if (role === "MASTER" || role === "BUSINESS_ADMIN") {
          hasPermission = true;
        } else if (permissions && Array.isArray(permissions)) {
          // Look for the specific permission only if permissions array exists
          const permission = permissions.find(
            (perm) => perm.permissionKey === key,
          );

          // Check if permission exists and if the user has the required access type
          if (permission) {
            hasPermission =
              action === "write" ? permission.canWrite : permission.canRead;
          }
        }

        return {
          key,
          action,
          label,
          hasPermission,
        };
      },
    );

    // Check if all permissions are granted
    const hasAllPermissions = permissionResults.every(
      (result) => result.hasPermission,
    );

    // Get the list of missing permissions
    const missingPermissions = permissionResults
      .filter((result) => !result.hasPermission)
      .map((result) => result.label);

    // Generate appropriate tooltip message
    let tooltipMessage = "";
    if (missingPermissions.length > 0) {
      tooltipMessage = `Você não possui as seguintes permissões necessárias: ${missingPermissions.join(", ")}`;
    }

    return {
      hasAllPermissions,
      missingPermissions,
      tooltipMessage,
    };
  }, [role, permissions, requiredPermissions]);
}

// Re-exported so the dozens of components that import both from here keep
// working; the map itself lives with the keys, in lib/permissions.
export { useCheckMultiplePermissions, getPermissionName };
