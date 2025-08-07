import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { NotificationState } from "../dto";
import { revalidateTagName } from "@/actions/revalidate";

import { useNotificationsContext } from "../../layout/protected-provider/notifications-provider";

function useNotifications(state: NotificationState | null | undefined) {
  const toastShownRef = useRef(false);
  const { removeNotification } = useNotificationsContext();

  useEffect(() => {
    toastShownRef.current = false;
    return () => {};
  }, []);

  useEffect(() => {
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

    if (state?.successMessage && state?.deletedNotificationId) {
      removeNotification(state.deletedNotificationId);
    }

    if (state?.successMessage && !toastShownRef.current) {
      toastShownRef.current = true;
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
  }, [state, removeNotification]);
}

export { useNotifications };
