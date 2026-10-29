import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth-store";

import type { UserLoggedData } from "../layout.types";

function useProtectedLayout(userLogged: UserLoggedData) {
  const storeUpdated = useRef<boolean>(false);
  const { setAuth } = useAuthStore();

  // Update the store with fresh server data
  useEffect(() => {
    // Only update if we have valid user data and haven't already updated
    if (userLogged && userLogged.role && !storeUpdated.current) {
      setAuth({
        id: userLogged.id || "",
        businessId: userLogged.businessId || "",
        role: userLogged.role,
        permissions: userLogged.permissions || [],
        enabledModules: userLogged.enabledModules ?? null,
      });

      storeUpdated.current = true;
    }
  }, [userLogged, setAuth]);

  // A failed notifications read is said by the bell's own sync
  // (sync-notifications-wrapper): it streams in after the page, so this
  // component no longer knows about it.
}

export { useProtectedLayout };
