import { UserRole, PermissionKey } from "../../shared/common.types";
import { ProtectedNavItem } from "../shared/common.types";

interface User {
  role: UserRole;
  permissions?: PermissionKey[];
  driverId?: string | null;
  profileAccess?: {
    permissions?: { permissionKey: PermissionKey }[];
  } | null;
  /** Server-rendered fallback while the auth store has not confirmed yet. */
  enabledModules?: string[];
}

interface ProtectedNavItemsProps {
  items: ProtectedNavItem[];
}

interface ProtectedSidebarMenuItemsProps {
  user: User;
}

export type { ProtectedNavItemsProps, ProtectedSidebarMenuItemsProps, User };
