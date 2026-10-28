/**
 * The operating-system notification for a realtime push, when the person
 * allowed it.
 *
 * The provider called `Notification.permission` and `new Notification()`
 * directly. iOS Safari has no `Notification` in a tab at all, so the socket
 * setup threw a ReferenceError into its catch and showed "Não foi possível se
 * conectar ao serviço de notificações" although the socket was fine; Android
 * Chrome has the constructor but throws a TypeError from it (pages must go
 * through a service worker there). The in-app toast already tells the person;
 * the system notification is a bonus, so where it can't be shown it is
 * skipped quietly.
 *
 * Permission is never asked here: browsers ignore or penalise a prompt with
 * no user gesture, and the notification list has the button that asks
 * (`useNotificationStatus`).
 */
function canShowBrowserNotification(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    window.Notification.permission === "granted"
  );
}

function showBrowserNotification(title: string, body: string): boolean {
  if (!canShowBrowserNotification()) return false;

  try {
    new window.Notification(title, { body, icon: "/favicon.ico" });

    return true;
  } catch {
    return false;
  }
}

export { canShowBrowserNotification, showBrowserNotification };
