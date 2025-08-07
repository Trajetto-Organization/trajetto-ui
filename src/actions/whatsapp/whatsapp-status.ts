"use server";

import { getCookies } from "@/actions/cookies";
import {
  ConnectionInfo,
  WhatsAppResponse,
} from "@/app/(protected)/_components/profile/notifications/whatsapp/dto";

/**
 * 🔄 Update WhatsApp connection status
 */
async function refreshWhatsAppStatus(): Promise<
  WhatsAppResponse<ConnectionInfo>
> {
  try {
    const tokenAccess = await getCookies("tkey");

    const response = await fetch(
      `${process.env.HTTP_REQUEST}/whatsapp/status`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-cache",
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
      message: "Status atualizado com sucesso",
      data: result.data,
    };
  } catch (error) {
    return {
      success: false,
      message:
        "Ocorreu um erro inesperado ao tentar obter status de atualização.",
    };
  }
}

/**
 * 🔍 Check for updated settings
 */
async function getUpdatedWhatsAppSettings(): Promise<WhatsAppResponse> {
  try {
    const tokenAccess = await getCookies("tkey");

    const response = await fetch(
      `${process.env.HTTP_REQUEST}/whatsapp/settings`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-cache",
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
      message: "Configurações atualizadas",
      data: result.data,
    };
  } catch (error) {
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao tentar obter as configurações.",
    };
  }
}

export { refreshWhatsAppStatus, getUpdatedWhatsAppSettings };
