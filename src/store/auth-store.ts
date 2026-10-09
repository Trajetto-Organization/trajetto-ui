import { create } from "zustand";
import { persist } from "zustand/middleware";

import { readSessionClaims } from "@/actions/session";

import type {
  PermissionKey,
  UserRole,
} from "@/app/(protected)/_components/shared/common.types";

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
        // The claims, decoded on the server: the token itself never reaches
        // the page (actions/session).
        let claims: Awaited<ReturnType<typeof readSessionClaims>> = null;

        try {
          claims = await readSessionClaims();
        } catch {
          claims = null;
        }

        if (claims) {
          set({
            id: claims.userId,
            role: claims.role as UserRole | null,
            // The token carries the company too. Without it the store said
            // "loaded" with a role and no company, and a company screen
            // read that as "no company": under load, when this finished
            // before the layout's setAuth, Integrações showed "Selecione
            // uma empresa" to a BUSINESS_ADMIN. A company setAuth already
            // wrote is kept.
            businessId: get().businessId || claims.businessId || null,
            isLoaded: true,
          });
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
          // businessId was missing from this list. clearStorage() below wipes
          // the persisted copy, but the in-memory state survives a logout that
          // is a soft navigation — so the previous user's carrier stayed in
          // the store, readable by anything that mounts before setAuth runs.
          businessId: null,
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
