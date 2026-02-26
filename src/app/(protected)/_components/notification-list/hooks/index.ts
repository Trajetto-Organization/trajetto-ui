import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { NotificationState } from "../dto";
import { revalidateTagName } from "@/actions/revalidate";

function useNotifications(state: NotificationState | null | undefined) {
  // Track the last processed state to avoid duplicate toasts
  const lastProcessedStateRef = useRef<string | null>(null);

  useEffect(() => {
    if (!state) return;

    // Skip if this exact state object reference was already processed
    // We use a simple comparison to detect new states
    if (lastProcessedStateRef.current === JSON.stringify(state)) {
      return;
    }

    if (state?.markAsReadError) {
      toast.error(state.markAsReadError);
      lastProcessedStateRef.current = JSON.stringify(state);

      return;
    }

    if (state?.markAllAsReadError) {
      toast.error(state.markAllAsReadError);
      lastProcessedStateRef.current = JSON.stringify(state);

      return;
    }

    if (state?.deleteNotificationError) {
      toast.error(state.deleteNotificationError);
      lastProcessedStateRef.current = JSON.stringify(state);

      return;
    }

    if (state?.refreshNotificationsError) {
      toast.error(state.refreshNotificationsError);
      lastProcessedStateRef.current = JSON.stringify(state);

      return;
    }

    // Note: removeNotification is now called directly in NotificationCard
    // before the action completes, so we don't need to call it here
    if (state?.successMessage) {
      // Update the last processed state
      lastProcessedStateRef.current = JSON.stringify(state);
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
