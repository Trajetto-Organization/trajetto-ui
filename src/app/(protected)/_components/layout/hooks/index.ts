import { useAuthStore } from "@/store/auth-store";
import { useEffect, useRef } from "react";

import { toast } from "sonner";
import { UserRole, Permission } from "../../dto";

interface UserLoggedData {
  id?: string;
  email: string;
  name: string;
  role: UserRole;
  businessId?: string;
  permissions: Permission[];
}

function useProtectedLayout(
  userLogged: UserLoggedData,
  error: boolean,
  notificationError: boolean = false,
) {
  const userToastDisplayed = useRef<boolean>(false);
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
      });
      storeUpdated.current = true;
    }
  }, [userLogged, setAuth]);

  // Display error toast for user data fetch errors
  useEffect(() => {
    if (error && !userToastDisplayed.current) {
      toast.error("Houve um erro ao tentar recuperar o usuário");
      userToastDisplayed.current = true;
    }
  }, [error]);

  // Display error toast for notification fetch errors
  useEffect(() => {
    if (notificationError && !notificationToastDisplayed.current) {
      toast.error("Não foi possível carregar suas notificações!");
      notificationToastDisplayed.current = true;
    }
  }, [notificationError]);
}

export { useProtectedLayout };
