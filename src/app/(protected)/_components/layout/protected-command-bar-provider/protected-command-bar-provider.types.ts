import { HTMLAttributes } from "react";
import type {
  UserRole,
  PermissionKey,
  UserPermission,
} from "../../shared/common.types";

interface ProtectedCommandBarProps extends HTMLAttributes<HTMLElement> {
  user: {
    role: UserRole;
    permissions?: UserPermission[];
    driverId?: string | null;
    profileAccess?: {
      permissions?: { permissionKey: PermissionKey }[];
    } | null;
  };
}

interface UseCommandBarActions {
  user: {
    role: UserRole;
    permissions?: { permissionKey: PermissionKey }[];
    driverId?: string | null;
    profileAccess?: {
      permissions?: { permissionKey: PermissionKey }[];
    } | null;
  };
}

interface Action {
  id: string;
  name: string;
  section: string;
  shortcut: string[];
  keywords: string;
  icon?: JSX.Element;
  perform: () => void;
  requiredPermission?: PermissionKey;
}

export type { ProtectedCommandBarProps, UseCommandBarActions, Action };
