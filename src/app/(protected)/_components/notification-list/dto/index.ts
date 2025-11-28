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

interface NotificationListProps {
  initialData: NotificationData;
  responseError: {
    error: boolean;
    errorMessage: string;
  };
  currentLimit: number;
  currentIncludeRead: boolean;
}

interface NotificationCardProps {
  notification: Notification;
}

export type {
  NotificationState,
  Notification,
  NotificationData,
  NotificationListProps,
  NotificationCardProps,
};
