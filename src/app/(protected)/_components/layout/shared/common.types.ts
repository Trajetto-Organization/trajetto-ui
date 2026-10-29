import type { Permission, UserRole } from "../../shared/common.types";
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
  /** Modules the company hired, resolved server side on every navigation. */
  enabledModules?: string[];
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
  // No access flags here on purpose: `url` is the key, and app-routes owns
  // which permission and which module that url needs.
  items?: ProtectedNavItem[];
}

export type { UserLogged, ProtectedNavItem };
