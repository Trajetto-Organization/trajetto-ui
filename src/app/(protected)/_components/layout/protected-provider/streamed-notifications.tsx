import { SyncNotificationsProvider } from "./sync-notifications-wrapper";

import type { FetchNotificationsResult } from "./protected-provider.types";

/**
 * The bell's server list, streamed in behind the page.
 *
 * The layout used to await the 50 notifications before rendering anything
 * under it, so every protected page waited for the slower of `/user/me` and
 * `/notification/stream`. The request now starts with the layout and this
 * component waits for it inside its own Suspense boundary: the page paints
 * as soon as the session gate passes, and the list syncs when it lands. A
 * revalidation re-renders the layout, which starts a new request, so the
 * list keeps following the server as it did.
 */
const StreamedNotifications = async ({
  request,
}: {
  request: Promise<FetchNotificationsResult>;
}): Promise<JSX.Element> => {
  const { notifications, notificationIds, error } = await request;

  return (
    <SyncNotificationsProvider
      serverNotifications={notifications}
      serverNotificationIds={notificationIds}
      error={error}
    />
  );
};

export { StreamedNotifications };
