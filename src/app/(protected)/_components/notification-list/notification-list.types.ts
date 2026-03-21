import type { Notification } from "./shared/common.types";

interface NotificationListProps {
  responseError: {
    error: boolean;
    errorMessage: string;
  };
}

interface FetchNotificationsProps {
  cursor?: string;
  includeRead?: boolean;
  signal?: AbortSignal;
}

interface NotificationStreamMeta {
  total: number;
  unread: number;
  nextCursor: string | null;
  hasMore: boolean;
}

interface NotificationCardProps {
  notification: Notification;
}

// ============================================================================
// NOTIFICATION CARD - Receives cache manipulation functions as props
// ============================================================================
interface ExtendedNotificationCardProps extends NotificationCardProps {
  onRemoveFromCache: (id: string) => void;
  onUpdateInCache: (id: string, updates: Partial<Notification>) => void;
}

interface FetchNotificationsResult {
  data: Notification[];
  meta: NotificationStreamMeta;
}

export type {
  NotificationListProps,
  FetchNotificationsProps,
  ExtendedNotificationCardProps,
  FetchNotificationsResult,
  NotificationStreamMeta,
};
