"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../cookies";
import { revalidateTagName } from "../revalidate";
import { apiFetch } from "@/lib/api-fetch";

interface NotificationsProps {
  message: string;
}

// Mark notification as read
const handleMarkNotificationAsRead = async (notificationId: string) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      markAsReadError: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const updateMarkNotificationAsRead = `${process.env.HTTP_REQUEST}/notification/${notificationId}/read`;

  try {
    const response = await apiFetch(updateMarkNotificationAsRead, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as NotificationsProps;

    if (!response.ok) {
      return { markAsReadError: message || refusalMessage(response.status) };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("notifications/handleMarkNotificationAsRead", error);
    return {
      markAsReadError:
        "Ocorreu um erro inesperado ao tentar marcar a notificação como lida.",
    };
  }
};

// Delete notification
const handleDeleteNotification = async (notificationId: string) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      deleteNotificationError:
        "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const deleteNotification = `${process.env.HTTP_REQUEST}/notification/${notificationId}`;

  try {
    const response = await apiFetch(deleteNotification, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as NotificationsProps;

    if (!response.ok) {
      return {
        deleteNotificationError: message || refusalMessage(response.status),
      };
    }

    return {
      successMessage: message,
      deletedNotificationId: notificationId,
    };
  } catch (error) {
    logActionError("notifications/handleDeleteNotification", error);
    return {
      deleteNotificationError:
        "Ocorreu um erro inesperado ao tentar excluir a notificação.",
    };
  }
};

// Mark every unread notification as read
const handleMarkAllNotificationsAsRead = async () => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      markAllError: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  try {
    const response = await apiFetch(
      `${process.env.HTTP_REQUEST}/notification/read-all`,
      {
        credentials: "include",
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
        },
      },
    );

    const { message } = (await response.json()) as NotificationsProps;

    if (!response.ok) {
      return { markAllError: message || refusalMessage(response.status) };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("notifications/handleMarkAllNotificationsAsRead", error);
    return {
      markAllError:
        "Ocorreu um erro inesperado ao tentar marcar as notificações como lidas.",
    };
  }
};

interface NotificationPreferenceRow {
  category: "FINES" | "MAINTENANCE" | "FINANCE" | "TASKS" | "ACCOUNT";
  inApp: boolean;
  email: boolean;
  whatsapp: boolean;
  isDefault: boolean;
}

// Get per-category notification preferences
const getNotificationPreferences = async (): Promise<{
  preferences?: NotificationPreferenceRow[];
  preferencesError?: string;
}> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      preferencesError: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  try {
    const response = await apiFetch(
      `${process.env.HTTP_REQUEST}/notification/preferences`,
      {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
        },
        next: { tags: ["notification-preferences"] },
      },
    );

    const result = await response.json();

    if (!response.ok) {
      return { preferencesError: result.message };
    }

    return { preferences: result.preferences };
  } catch (error) {
    logActionError("notifications/getNotificationPreferences", error);
    return {
      preferencesError:
        "Ocorreu um erro inesperado ao tentar carregar as preferências.",
    };
  }
};

// Update per-category notification preferences
const updateNotificationPreferences = async (
  preferences: Omit<NotificationPreferenceRow, "isDefault">[],
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      updateError: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  try {
    const response = await apiFetch(
      `${process.env.HTTP_REQUEST}/notification/preferences`,
      {
        credentials: "include",
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ preferences }),
      },
    );

    const { message } = (await response.json()) as NotificationsProps;

    if (!response.ok) {
      return { updateError: message || refusalMessage(response.status) };
    }

    await revalidateTagName("notification-preferences");

    return { successMessage: message };
  } catch (error) {
    logActionError("notifications/updateNotificationPreferences", error);
    return {
      updateError:
        "Ocorreu um erro inesperado ao tentar salvar as preferências.",
    };
  }
};

export {
  handleDeleteNotification,
  handleMarkNotificationAsRead,
  handleMarkAllNotificationsAsRead,
  getNotificationPreferences,
  updateNotificationPreferences,
};

export type { NotificationPreferenceRow };
