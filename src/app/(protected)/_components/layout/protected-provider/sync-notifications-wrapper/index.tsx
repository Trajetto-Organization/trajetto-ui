"use client";

import { useEffect } from "react";
import { useNotificationsContext } from "../notifications-provider";

interface SyncNotificationsProviderProps {
  children: React.ReactNode;
  serverNotificationIds: string[];
}

const SyncNotificationsProvider = ({
  children,
  serverNotificationIds,
}: SyncNotificationsProviderProps) => {
  const { syncWithServerData } = useNotificationsContext();

  useEffect(() => {
    if (serverNotificationIds.length > 0) {
      const timeoutId = setTimeout(() => {
        syncWithServerData(serverNotificationIds);
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [serverNotificationIds, syncWithServerData]);

  return <>{children}</>;
};

export { SyncNotificationsProvider };
