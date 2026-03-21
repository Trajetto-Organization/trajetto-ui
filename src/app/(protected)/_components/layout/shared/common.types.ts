import type {
  Permission,
  UserRole,
  PermissionKey,
} from "../../shared/common.types";
import { protectedNavIcons } from "../protected-navbar-items";

interface UserLogged {
  id?: string;
  businessId?: string;
  avatar?: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: Permission[];
  driverId?: string | null;
  profileAccess?: {
    permissions?: Permission[];
  } | null;
}

interface ProtectedNavItem {
  title: string;
  url: string;
  disabled?: boolean;
  external?: boolean;
  icon?: keyof typeof protectedNavIcons;
  label?: string;
  description?: string;
  isActive?: boolean;
  requiredPermission?: PermissionKey;
  items?: ProtectedNavItem[];
}

export type { UserLogged, ProtectedNavItem };
