import { ReactNode } from "react";

import type { UserLogged } from "./shared/common.types";
import type { Permission, UserRole } from "../shared/common.types";

interface ProtectedLayoutLayoutProps {
  userLogged: UserLogged;
  children: ReactNode;
  notificationError: boolean;
}

interface UserLoggedData {
  id?: string;
  email: string;
  name: string;
  role: UserRole;
  businessId?: string;
  permissions: Permission[];
  enabledModules?: string[];
}

export type { ProtectedLayoutLayoutProps, UserLoggedData };
