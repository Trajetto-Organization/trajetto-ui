"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateActivityNotifications } from "@/actions/update-activity-notifications";

interface UseActivityNotificationsProps {
  initialEnabled: boolean;
}

interface UseActivityNotificationsReturn {
  isEnabled: boolean;
  isUpdating: boolean;
  handleToggle: (enabled: boolean) => Promise<void>;
}

function useActivityNotifications({
  initialEnabled,
}: UseActivityNotificationsProps): UseActivityNotificationsReturn {
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();

  const handleToggle = async (enabled: boolean) => {
    startTransition(async () => {
      try {
        const result = await updateActivityNotifications({ enabled });

        if (result.success) {
          setIsEnabled(enabled);
          toast.success(result.message, {
            duration: 3000,
            id: "activity-notifications-update",
          });
        } else {
          toast.error(result.message, {
            duration: 5000,
            id: "activity-notifications-error",
          });
        }
      } catch (error) {
        toast.error("Erro inesperado ao atualizar notificações de atividade", {
          duration: 5000,
          id: "activity-notifications-error",
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

export { useActivityNotifications };
