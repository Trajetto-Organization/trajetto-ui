"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import type {
  ActivityNotificationsProps,
  ActivityNotificationsReturn,
} from "../activity.types";
import { updateActivityNotifications } from "@/actions/user/update-activity-notifications";

function useActivityNotifications({
  initialEnabled,
}: ActivityNotificationsProps): ActivityNotificationsReturn {
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
