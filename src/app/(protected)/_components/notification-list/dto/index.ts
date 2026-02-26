interface NotificationState {
  markAsReadError?: string;
  markAllAsReadError?: string;
  deleteNotificationError?: string;
  refreshNotificationsError?: string;
  successMessage?: string;
  deletedNotificationId?: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  created_at: string | Date;
  type: string;
}

interface NotificationData {
  data: Notification[];
  total: number;
  unread: number;
}

interface NotificationStreamMeta {
  total: number;
  unread: number;
  nextCursor: string | null;
  hasMore: boolean;
}

interface NotificationListProps {
  responseError: {
    error: boolean;
    errorMessage: string;
  };
}

interface NotificationCardProps {
  notification: Notification;
}

interface FetchNotificationsProps {
  cursor?: string;
  includeRead?: boolean;
  signal?: AbortSignal;
}

export type {
  NotificationState,
  Notification,
  NotificationData,
  NotificationStreamMeta,
  NotificationListProps,
  NotificationCardProps,
  FetchNotificationsProps,
};
