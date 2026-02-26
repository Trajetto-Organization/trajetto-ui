"use client";

import { useEffect, useRef } from "react";
import { useNotificationsContext } from "../notifications-provider";

import { SyncNotificationsProviderProps } from "../../dto";

const SyncNotificationsProvider = ({
  children,
  serverNotifications,
  serverNotificationIds,
}: SyncNotificationsProviderProps): JSX.Element => {
  const { replaceAllNotifications } = useNotificationsContext();

  const hasInitialized = useRef(false);
  const previousDataKey = useRef<string>("");

  useEffect(() => {
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
  }, [serverNotifications, serverNotificationIds, replaceAllNotifications]);

  return <>{children}</>;
};

export { SyncNotificationsProvider };
