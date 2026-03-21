"use server";

import { getCookies } from "@/actions/cookies";
import { revalidateTagName } from "@/actions/revalidate";

import type {
  UpdateWhatsAppSettingsRequest,
  WhatsAppResponse,
  WhatsAppSettings,
} from "@/app/(protected)/_components/profile/notifications/whatsapp/shared/common.types";
import { updateWhatsAppSettingsSchema } from "@/schemas/phone-validation-schema";

/**
 * 🔧 Get current WhatsApp settings
 */
async function getWhatsAppSettings(): Promise<
  WhatsAppResponse<WhatsAppSettings>
> {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      success: false,
      message: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  try {
    const response = await fetch(
      `${process.env.HTTP_REQUEST}/whatsapp/settings`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        next: { tags: ["whatsapp-settings"] },
      },
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.message,
      };
    }

    return {
      success: true,
      message: "Configurações obtidas com sucesso",
      data: result.data,
    };
  } catch (error) {
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao tentar obter as configurações.",
    };
  }
}

/**
 * 📝 Update WhatsApp settings
 */
async function updateWhatsAppSettings(
  data: UpdateWhatsAppSettingsRequest,
): Promise<WhatsAppResponse<WhatsAppSettings>> {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      success: false,
      message: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  try {
    const validation = updateWhatsAppSettingsSchema.safeParse(data);

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return {
        success: false,
        message: firstError.message,
      };
    }

    const response = await fetch(
      `${process.env.HTTP_REQUEST}/whatsapp/settings`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(validation.data),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.message,
      };
    }

    await revalidateTagName("whatsapp-settings");

    return {
      success: true,
      message: result.message,
      data: result.data,
    };
  } catch (error) {
    return {
      success: false,
      message:
        "Ocorreu um erro inesperado ao tentar atualizar as configurações.",
    };
  }
}

export { getWhatsAppSettings, updateWhatsAppSettings };
