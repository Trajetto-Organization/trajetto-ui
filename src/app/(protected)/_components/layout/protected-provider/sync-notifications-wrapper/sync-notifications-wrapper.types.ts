import { ReactNode } from "react";

interface ServerNotification {
  id: string;
  title: string;
  message: string;
  link?: string;
  type: string;
  read: boolean;
  created_at: string | Date;
}

interface SyncNotificationsProviderProps {
  children: ReactNode;
  serverNotifications: ServerNotification[];
  serverNotificationIds: string[];
}

export type { SyncNotificationsProviderProps };
