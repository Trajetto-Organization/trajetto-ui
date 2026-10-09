"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { createUpdateFuelTypeSchema } from "@/schemas/create-update-fuel-type-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface VehicleTypeProps {
  message: string;
}

const handleUpdateFuelType = async (
  state: any,
  updateFuelTypeValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      updateFuelTypeError: {
        updateFuelTypeErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (updateFuelTypeValues.type === "RESET") {
    return {};
  }

  const fuelTypeId = updateFuelTypeValues.get("fuelTypeId");
  const businessId = updateFuelTypeValues.get("businessId");

  const updateFuelType = `${process.env.HTTP_REQUEST}/fuel-type/update-fuel-type/${fuelTypeId}/business/${businessId}`;
  const fuelTypeValues = Object.fromEntries(updateFuelTypeValues.entries());

  const updateFuelTypeValidation =
    createUpdateFuelTypeSchema.safeParse(fuelTypeValues);

  if (updateFuelTypeValidation.error) {
    const formatError = updateFuelTypeValidation.error.flatten();

    return {
      updateFuelTypeError: formatError.fieldErrors,
    };
  }

  const fuelTypeData = updateFuelTypeValidation.data;

  try {
    const response = await apiFetch(updateFuelType, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(fuelTypeData),
    });

    const { message } = (await response.json()) as VehicleTypeProps;

    if (!response.ok) {
      return {
        updateFuelTypeError: {
          updateFuelTypeErrorMessage:
            message || refusalMessage(response.status),
        },
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("fuel-type/update-fuel-type", error);
    return {
      updateFuelTypeError: {
        updateFuelTypeErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar o tipo do combustível.",
      },
    };
  }
};

export { handleUpdateFuelType };
