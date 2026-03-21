"use server";

import { getCookies } from "@/actions/cookies";
import type {
  QRCodeData,
  WhatsAppResponse,
} from "@/app/(protected)/_components/profile/notifications/whatsapp/shared/common.types";

/**
 * 📱 Get QR Code for WhatsApp connection
 */
async function getWhatsAppQRCode(): Promise<WhatsAppResponse<QRCodeData>> {
  try {
    const tokenAccess = await getCookies("tkey");

    if (!tokenAccess) {
      return {
        success: false,
        message: "Token de acesso não encontrado. Faça login novamente.",
      };
    }

    const response = await fetch(
      `${process.env.HTTP_REQUEST}/whatsapp/connect/qrcode`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
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
      message: result.message,
      data: result.data,
    };
  } catch (error) {
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao tentar obter o QR Code.",
    };
  }
}

export { getWhatsAppQRCode };
