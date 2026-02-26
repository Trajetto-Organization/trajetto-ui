"use server";

import { getCookies } from "../cookies";

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

export { handleDeleteNotification, handleMarkNotificationAsRead };
