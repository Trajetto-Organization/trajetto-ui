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
    /** Server-rendered fallback while the auth store has not confirmed yet. */
    enabledModules?: string[];
  };
}

interface UseCommandBarActions {
  user: {
    role: UserRole;
    /** Only the rows with canRead count; see `readablePermissionKeys`. */
    permissions?: { permissionKey: PermissionKey; canRead?: boolean }[];
    driverId?: string | null;
    profileAccess?: {
      permissions?: { permissionKey: PermissionKey }[];
    } | null;
  };
  /**
   * Modules the company has hired. `null` means "not confirmed yet" and
   * leaves the gate open rather than blanking the list.
   */
  enabledModules?: string[] | null;
}

interface Action {
  id: string;
  name: string;
  section: string;
  shortcut: string[];
  keywords: string;
  icon?: JSX.Element;
  perform: () => void;
  /**
   * Where the entry navigates to. It is also the access key: app-routes owns
   * which permission and which module this path needs. Entries without a path
   * are never gated.
   */
  path?: string;
}

export type { ProtectedCommandBarProps, UseCommandBarActions, Action };
