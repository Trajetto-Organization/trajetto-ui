"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateEmailNotifications } from "@/actions/update-email-notifications";

interface UseEmailNotificationsProps {
  initialEnabled: boolean;
}

interface UseEmailNotificationsReturn {
  isEnabled: boolean;
  isUpdating: boolean;
  handleToggle: (enabled: boolean) => Promise<void>;
}

function useEmailNotifications({
  initialEnabled,
}: UseEmailNotificationsProps): UseEmailNotificationsReturn {
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();

  const handleToggle = async (enabled: boolean) => {
    startTransition(async () => {
      try {
        const result = await updateEmailNotifications({ enabled });

        if (result.success) {
          setIsEnabled(enabled);
          toast.success(result.message, {
            duration: 3000,
            id: "email-notifications-update",
          });
        } else {
          toast.error(result.message, {
            duration: 5000,
            id: "email-notifications-error",
          });
        }
      } catch (error) {
        toast.error("Erro inesperado ao atualizar notificações por email", {
          duration: 5000,
          id: "email-notifications-error",
        });
      }
    });
  };

  return {
    isEnabled,
    isUpdating: isPending,
    handleToggle,
  };
}

export { useEmailNotifications };
