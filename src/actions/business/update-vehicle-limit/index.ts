"use server";

import { getCookies } from "../../cookies";
import { updateVehicleLimitSchema } from "@/schemas/update-vehicle-limit-schema";

interface UpdateVehicleLimitResponse {
  message: string;
}

const handleUpdateVehicleLimit = async (state: any, formData: FormData) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      updateVehicleLimitError: {
        updateVehicleLimitErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (formData.type === "RESET") {
    return {};
  }

  const businessId = formData.get("businessId");
  const values = Object.fromEntries(formData.entries());

  const validation = updateVehicleLimitSchema.safeParse(values);

  if (!validation.success) {
    const formatError = validation.error.flatten();
    return {
      updateVehicleLimitError: formatError.fieldErrors,
    };
  }

  const { vehicle_limit } = validation.data;

  try {
    const response = await fetch(
      `${process.env.HTTP_REQUEST}/business/update-vehicle-limit/${businessId}`,
      {
        credentials: "include",
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ vehicle_limit }),
      },
    );

    const { message } = (await response.json()) as UpdateVehicleLimitResponse;

    if (!response.ok && message) {
      return {
        updateVehicleLimitError: { updateVehicleLimitErrorMessage: message },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      updateVehicleLimitError: {
        updateVehicleLimitErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar o limite de veículos.",
      },
    };
  }
};

export { handleUpdateVehicleLimit };
