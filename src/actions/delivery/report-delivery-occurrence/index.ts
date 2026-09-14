"use server";

import { getCookies } from "../../cookies";

interface ActionResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
}

const reportDeliveryOccurrence = async (
  businessId: string,
  deliveryId: string,
  occurrence: {
    occurrenceTypeId: string;
    description?: string;
    latitude?: number;
    longitude?: number;
  },
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
      `${process.env.HTTP_REQUEST}/delivery/report-occurrence/${deliveryId}/business/${businessId}`,
      {
        credentials: "include",
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(occurrence),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.message || "Houve um erro ao registrar a ocorrência.",
      };
    }

    return { success: true, message: result.message };
  } catch (error) {
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao registrar a ocorrência.",
    };
  }
};

export { reportDeliveryOccurrence };
