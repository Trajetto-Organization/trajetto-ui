import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { NotificationState } from "../dto";
import { revalidateTagName } from "@/actions/revalidate";

function useNotifications(state: NotificationState | null | undefined) {
  const processedStatesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!state) return;

    // Create a unique key for this state to avoid duplicate toasts
    const stateKey = JSON.stringify(state);

    if (state?.markAsReadError) {
      toast.error(state.markAsReadError);
      return;
    }

    if (state?.markAllAsReadError) {
      toast.error(state.markAllAsReadError);
      return;
    }

    if (state?.deleteNotificationError) {
      toast.error(state.deleteNotificationError);
      return;
    }

    if (state?.refreshNotificationsError) {
      toast.error(state.refreshNotificationsError);
      return;
    }

    // Note: removeNotification is now called directly in NotificationCard
    // before the action completes, so we don't need to call it here

    if (state?.successMessage && !processedStatesRef.current.has(stateKey)) {
      processedStatesRef.current.add(stateKey);
      toast.success(state.successMessage);

      const performRevalidation = async () => {
        try {
          await revalidateTagName("update-notification");
        } catch (error: any) {
          toast.error(error.message);
        }
      };

      performRevalidation();
    }
  }, [state]);
}

export { useNotifications };
