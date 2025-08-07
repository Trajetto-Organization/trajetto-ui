interface NotificationState {
  markAsReadError?: string;
  markAllAsReadError?: string;
  deleteNotificationError?: string;
  refreshNotificationsError?: string;
  successMessage?: string;
  deletedNotificationId?: string;
}

export type { NotificationState };
