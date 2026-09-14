import { create } from "zustand";
import { persist } from "zustand/middleware";

import { parseJwt } from "../lib/decode-jwt";
import { getCookies } from "@/actions/cookies";

import type {
  PermissionKey,
  UserRole,
} from "@/app/(protected)/_components/shared/common.types";

interface PermissionData {
  permissionKey: PermissionKey;
  canRead: boolean;
  canWrite: boolean;
}

interface PermissionData {
  permissionKey: PermissionKey;
  canRead: boolean;
  canWrite: boolean;
}

interface AuthState {
  id: string | null;
  businessId: string | null;
  role: UserRole | null;
  permissions: PermissionData[];
  /**
   * Modules the company hired, kept fresh by the security check so the menus
   * redraw the moment the master flips one. `null` means "not confirmed yet"
   * and callers must not enforce the gate on it.
   */
  enabledModules: string[] | null;
  isLoaded: boolean;
  loadAuth: () => Promise<void>;
  setAuth: (data: {
    id: string;
    businessId: string;
    role: UserRole;
    permissions: PermissionData[];
    enabledModules?: string[] | null;
  }) => void;
  logout: () => void;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      id: null,
      businessId: null,
      role: null,
      permissions: [],
      enabledModules: null,
      isLoaded: false,
      loadAuth: async () => {
        if (get().isLoaded && get().role !== null) return;
        const token = await getCookies("tkey");

        if (token) {
          try {
            const decoded = parseJwt(token as string);
            set({
              id: decoded.sub,
              role: decoded.role,
              isLoaded: true,
            });
          } catch (error) {
            set({ isLoaded: true });
          }
        } else {
          set({ isLoaded: true });
        }
      },
      setAuth: ({ enabledModules, ...data }) => {
        set({
          ...data,
          // Omitting the field must not erase a value the session already
          // confirmed — only an explicit list (or null) replaces it.
          enabledModules:
            enabledModules === undefined
              ? useAuthStore.getState().enabledModules
              : enabledModules,
          isLoaded: true,
        });
      },
      logout: async () => {
        set({
          id: null,
          role: null,
          permissions: [],
          enabledModules: null,
          isLoaded: false,
        });
        useAuthStore.persist.clearStorage();
      },
    }),
    {
      name: "auth-store",
    },
  ),
);

export { useAuthStore };
