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
  /** Optional: the layout renders it beside the page, not around it. */
  children?: ReactNode;
  serverNotifications: ServerNotification[];
  serverNotificationIds: string[];
  /** The server could not read the list: said once, the app carries on. */
  error?: boolean;
}

export type { SyncNotificationsProviderProps };
