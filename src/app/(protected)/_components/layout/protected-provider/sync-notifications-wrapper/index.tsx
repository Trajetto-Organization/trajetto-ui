"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { useNotificationsContext } from "../notifications-provider";

import type { SyncNotificationsProviderProps } from "./sync-notifications-wrapper.types";

const SyncNotificationsProvider = ({
  children,
  serverNotifications,
  serverNotificationIds,
  error = false,
}: SyncNotificationsProviderProps): JSX.Element => {
  const { replaceAllNotifications } = useNotificationsContext();

  const hasInitialized = useRef(false);
  const previousDataKey = useRef<string>("");
  const errorToastDisplayed = useRef(false);

  // Notifications are not a security gate, so a failure here is a toast and
  // the app carries on — and a failed read is not "no notifications": the
  // list on screen is left as it was instead of being emptied.
  useEffect(() => {
    if (error && !errorToastDisplayed.current) {
      toast.error("Não foi possível carregar suas notificações!");
      errorToastDisplayed.current = true;
    }
  }, [error]);

  useEffect(() => {
    if (error) return;

    // CRITICAL FIX: Process even when arrays are empty!
    // This is necessary to handle the case where all notifications have been deleted
    // Previously, we were returning early when both arrays were empty,
    // which prevented the state from being cleared

    // Create a stable key to detect data changes
    // Use "__EMPTY__" as a special key for empty arrays to ensure they're tracked
    const dataKey =
      serverNotificationIds.length > 0
        ? JSON.stringify(serverNotificationIds.sort())
        : "__EMPTY__";

    // Skip if data hasn't changed
    if (dataKey === previousDataKey.current) {
      return;
    }

    previousDataKey.current = dataKey;

    // ALWAYS replace with server data, even if empty
    // Server is the single source of truth
    replaceAllNotifications(serverNotifications);
    hasInitialized.current = true;
  }, [
    error,
    serverNotifications,
    serverNotificationIds,
    replaceAllNotifications,
  ]);

  return <>{children}</>;
};

export { SyncNotificationsProvider };
