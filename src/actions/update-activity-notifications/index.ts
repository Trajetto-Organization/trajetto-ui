"use server";

import { getCookies } from "@/actions/cookies";
import { revalidateTagName } from "../revalidate";

interface UpdateActivityNotificationsProps {
  enabled: boolean;
}

interface UpdateActivityNotificationsResponse {
  success: boolean;
  message: string;
  error?: string;
}

async function updateActivityNotifications({
  enabled,
}: UpdateActivityNotificationsProps): Promise<UpdateActivityNotificationsResponse> {
  try {
    const tokenAccess = await getCookies("tkey");
    const response = await fetch(
      `${process.env.HTTP_REQUEST}/user/activity-notifications`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenAccess}`,
        },
        credentials: "include",
        body: JSON.stringify({
          notification_enabled: enabled,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || "Erro ao atualizar notificações de atividade",
        error: data.error,
      };
    }

    // Revalidate tags to update cached data
    await Promise.all([
      revalidateTagName("user-profile"),
      revalidateTagName("activity-notifications"),
    ]);

    return {
      success: true,
      message: enabled
        ? "Notificações de atividade habilitadas com sucesso!"
        : "Notificações de atividade desabilitadas com sucesso!",
    };
  } catch (error) {
    return {
      success: false,
      message: "Erro interno do servidor",
      error: "INTERNAL_SERVER_ERROR",
    };
  }
}

export { updateActivityNotifications };
