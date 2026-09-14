import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth-store";

import type { UserLoggedData } from "../layout.types";
import { toast } from "sonner";

function useProtectedLayout(
  userLogged: UserLoggedData,
  notificationError: boolean = false,
) {
  const notificationToastDisplayed = useRef<boolean>(false);

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

  // Notifications are not a security gate, so a failure here is a toast and
  // the app carries on. A failed *user* fetch is the opposite and no longer
  // reaches this component: the provider redirects to the login rather than
  // render a session it could not confirm.
  useEffect(() => {
    if (notificationError && !notificationToastDisplayed.current) {
      toast.error("Não foi possível carregar suas notificações!");
      notificationToastDisplayed.current = true;
    }
  }, [notificationError]);
}

export { useProtectedLayout };
