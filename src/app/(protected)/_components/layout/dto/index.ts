import { ReactNode, HTMLAttributes } from "react";
import { Permission, UserRole, PermissionKey, UserPermission } from "../../dto";

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

interface ProtectedLayoutLayoutProps {
  userLogged: UserLogged;
  children: ReactNode;
  error: boolean;
  notificationCount: number;
  notificationError: boolean;
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

interface User {
  role: UserRole;
  permissions?: PermissionKey[];
  driverId?: string | null;
  profileAccess?: {
    permissions?: { permissionKey: PermissionKey }[];
  } | null;
}

interface ProtectedSidebarMenuItemsProps {
  user: User;
}

interface ProtectedNavItemsProps {
  items: ProtectedNavItem[];
}

interface SyncNotificationsProviderProps {
  children: React.ReactNode;
  serverNotificationIds: string[];
}

interface SafeSidebarProviderProps {
  children: ReactNode;
}

interface ProtectedPageContainerProps {
  children: ReactNode;
  scrollable?: boolean;
}

interface ProtectedHeadingProps {
  title: string;
  description: string;
}

interface ProtectedSectionColumnsType {
  title: string;
  description?: string;
  children: ReactNode;
}

interface UserLoggedData {
  id?: string;
  email: string;
  name: string;
  role: UserRole;
  businessId?: string;
  permissions: Permission[];
}

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
    permissions?: UserPermission[];
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

interface ProtectedAccountSettingsProps {
  userLogged: UserLogged;
  notificationCount: number;
}

export type {
  UserLogged,
  ProtectedLayoutLayoutProps,
  ProtectedNavItem,
  User,
  ProtectedSidebarMenuItemsProps,
  ProtectedNavItemsProps,
  SyncNotificationsProviderProps,
  SafeSidebarProviderProps,
  ProtectedPageContainerProps,
  ProtectedHeadingProps,
  ProtectedSectionColumnsType,
  UserLoggedData,
  ProtectedCommandBarProps,
  UseCommandBarActions,
  ProtectedAccountSettingsProps,
  Action,
};
