import { useEffect } from "react";

import type { PermissionKey } from "@/app/(protected)/_components/shared/common.types";
import { useAuthStore } from "../store/auth-store";

type AccessType = "read" | "write";

const useHasPermission = (
  requiredPermissionKey: PermissionKey,
  accessType: AccessType = "read",
): boolean => {
  const { role, permissions, loadAuth, isLoaded } = useAuthStore();

  useEffect(() => {
    if (!isLoaded || role === null) {
      loadAuth();
    }
  }, [isLoaded, role, loadAuth]);

  if (role === "MASTER" || role === "BUSINESS_ADMIN") {
    return true;
  }

  // Check if permissions array exists before using .find()
  if (!permissions || !Array.isArray(permissions)) {
    return false;
  }

  const permission = permissions.find(
    (perm) => perm.permissionKey === requiredPermissionKey,
  );

  if (!permission) return false;
  return accessType === "write" ? permission.canWrite : permission.canRead;
};

export { useHasPermission };
