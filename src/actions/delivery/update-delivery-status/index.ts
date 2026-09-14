"use server";

import { getCookies } from "../../cookies";

import type { DeliveryStatus } from "../get-delivery";

interface ActionResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
}

const updateDeliveryStatus = async (
  businessId: string,
  deliveryId: string,
  status: DeliveryStatus,
  receivedBy?: string,
): Promise<ActionResponse> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      success: false,
      message: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  try {
    const response = await fetch(
      `${process.env.HTTP_REQUEST}/delivery/update-delivery-status/${deliveryId}/business/${businessId}`,
      {
        credentials: "include",
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          ...(receivedBy && { received_by: receivedBy }),
        }),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message:
          result.message || "Houve um erro ao mudar o status da entrega.",
      };
    }

    return { success: true, message: result.message };
  } catch (error) {
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao mudar o status da entrega.",
    };
  }
};

export { updateDeliveryStatus };
