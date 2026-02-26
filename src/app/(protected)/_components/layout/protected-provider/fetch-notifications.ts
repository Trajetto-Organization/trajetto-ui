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

export async function fetchNotifications(
  tokenAccess: string,
): Promise<FetchNotificationsResult> {
  try {
    const response = await fetch(
      `${process.env.HTTP_REQUEST}/notification/stream?limit=50&includeRead=true`,
      {
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        next: { tags: ["update-notification"] },
      },
    );

    if (!response.ok) {
      return { notifications: [], notificationIds: [], error: true };
    }

    // Parse NDJSON response (each line is a separate JSON object)
    const text = await response.text();
    const lines = text.split("\n").filter((line) => line.trim());

    const notificationData: any[] = [];

    for (const line of lines) {
      try {
        const json = JSON.parse(line);
        // Skip meta object, only collect notification objects
        if (!json.meta) {
          notificationData.push(json);
        }
      } catch {
        // Skip malformed lines
      }
    }

    const notifications: ServerNotification[] = notificationData.map(
      (notification: any) => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        link: notification.link,
        type: notification.type,
        read: notification.read,
        created_at: notification.created_at,
      }),
    );

    return {
      notifications,
      notificationIds: notifications.map((n) => n.id),
      error: false,
    };
  } catch {
    return { notifications: [], notificationIds: [], error: true };
  }
}

export type { ServerNotification };
