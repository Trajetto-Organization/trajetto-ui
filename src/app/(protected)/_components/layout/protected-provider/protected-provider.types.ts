import type { UserLoggedProps } from "../../shared/common.types";

interface ValidateUserAccessParams {
  user: UserLoggedProps["user"];
  jwtRole: string;
  jwtDriverId: string | null;
  pathname: string;
}

interface ServerNotification {
  id: string;
  title: string;
  message: string;
  link?: string;
  type: string;
  read: boolean;
  created_at: string | Date;
}

interface FetchNotificationsResult {
  notifications: ServerNotification[];
  notificationIds: string[];
  error: boolean;
}

export type {
  ValidateUserAccessParams,
  ServerNotification,
  FetchNotificationsResult,
};
