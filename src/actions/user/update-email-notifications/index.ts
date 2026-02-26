"use server";

import { getCookies } from "@/actions/cookies";
import { revalidateTagName } from "../../revalidate";

interface UpdateEmailNotificationsProps {
  enabled: boolean;
}

interface UpdateEmailNotificationsResponse {
  success: boolean;
  message: string;
  error?: string;
}

async function updateEmailNotifications({
  enabled,
}: UpdateEmailNotificationsProps): Promise<UpdateEmailNotificationsResponse> {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      success: false,
      message: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  try {
    const response = await fetch(
      `${process.env.HTTP_REQUEST}/user/email-notifications`,
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
        message: data.message || "Erro ao atualizar notificações por email",
        error: data.error,
      };
    }

    // Revalidate tags to update cached data
    await Promise.all([
      revalidateTagName("user-profile"),
      revalidateTagName("email-notifications"),
    ]);

    return {
      success: true,
      message: enabled
        ? "Notificações por email habilitadas com sucesso!"
        : "Notificações por email desabilitadas com sucesso!",
    };
  } catch (error) {
    return {
      success: false,
      message: "Erro interno do servidor",
      error: "INTERNAL_SERVER_ERROR",
    };
  }
}

export { updateEmailNotifications };
