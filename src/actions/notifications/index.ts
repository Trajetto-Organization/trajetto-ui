"use server";

import { getCookies } from "../cookies";

interface NotificationsProps {
  message: string;
}

// Mark notification as read
const handleMarkNotificationAsRead = async (notificationId: string) => {
  const updateMarkNotificationAsRead = `${process.env.HTTP_REQUEST}/notification/${notificationId}/read`;
  const tokenAccess = await getCookies("tkey");

  try {
    const response = await fetch(updateMarkNotificationAsRead, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as NotificationsProps;

    if (!response.ok && message) {
      return { markAsReadError: message };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      markAsReadError:
        "Ocorreu um erro inesperado ao tentar marcar a notificação como lida.",
    };
  }
};

// Mark all notifications as read
const handleMarkAllNotificationsAsRead = async () => {
  const updateMarkAllNotificationAsRead = `${process.env.HTTP_REQUEST}/notification/read-all`;
  const tokenAccess = await getCookies("tkey");

  try {
    const response = await fetch(updateMarkAllNotificationAsRead, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as NotificationsProps;

    if (!response.ok && message) {
      return { markAllAsReadError: message };
    }

    return {
      successMessage: message,
    };
  } catch (error) {
    return {
      markAllAsReadError:
        "Ocorreu um erro inesperado ao tentar marcar todas as notificações como lidas.",
    };
  }
};

// Delete notification
const handleDeleteNotification = async (notificationId: string) => {
  const deleteNotification = `${process.env.HTTP_REQUEST}/notification/${notificationId}`;
  const tokenAccess = await getCookies("tkey");

  try {
    const response = await fetch(deleteNotification, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as NotificationsProps;

    if (!response.ok && message) {
      return { deleteNotificationError: message };
    }

    return {
      successMessage: message,
      deletedNotificationId: notificationId,
    };
  } catch (error) {
    return {
      deleteNotificationError:
        "Ocorreu um erro inesperado ao tentar excluir a notificação.",
    };
  }
};

export {
  handleDeleteNotification,
  handleMarkAllNotificationsAsRead,
  handleMarkNotificationAsRead,
};
