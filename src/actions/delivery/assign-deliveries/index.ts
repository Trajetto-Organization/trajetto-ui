"use server";

import { getCookies } from "../../cookies";

interface ActionResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
}

/**
 * Batch assignment — all-or-nothing on the API side: any delivery outside
 * PENDING rejects the whole batch naming the offenders, so the caller can
 * surface the message as-is.
 */
const assignDeliveries = async (
  businessId: string,
  deliveryIds: string[],
  driverId: string,
  vehicleId?: string,
): Promise<ActionResponse<{ assigned: number }>> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      success: false,
      message: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  try {
    const response = await fetch(
      `${process.env.HTTP_REQUEST}/delivery/assign-deliveries/${businessId}`,
      {
        credentials: "include",
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deliveryIds,
          driverId,
          ...(vehicleId && { vehicleId }),
        }),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.message || "Houve um erro ao atribuir as entregas.",
      };
    }

    return { success: true, message: result.message, data: result.data };
  } catch (error) {
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao atribuir as entregas.",
    };
  }
};

export { assignDeliveries };
