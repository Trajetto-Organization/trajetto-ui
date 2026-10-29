"use server";

import { logActionError } from "@/lib/log-action-error";
import { updateVehicleTypeSchema } from "@/schemas/create-update-vehicle-type-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface VehicleTypeResponse {
  code?: string;
  message: string;
}

/** Saves an edit; the form sends only the fields that changed. */
const handleUpdateVehicleType = async (
  state: unknown,
  updateVehicleTypeValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      updateVehicleTypeError: {
        updateVehicleTypeErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  const vehicleTypeId = updateVehicleTypeValues.get("vehicleTypeId");
  const businessId = updateVehicleTypeValues.get("businessId");

  const url = `${process.env.HTTP_REQUEST}/vehicle-type/update-vehicle-type/${vehicleTypeId}/business/${businessId}`;

  const {
    businessId: _business,
    vehicleTypeId: _type,
    ...changes
  } = Object.fromEntries(updateVehicleTypeValues.entries());

  const validation = updateVehicleTypeSchema.safeParse(changes);

  if (!validation.success) {
    return { updateVehicleTypeError: validation.error.flatten().fieldErrors };
  }

  try {
    const response = await apiFetch(url, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validation.data),
    });

    const { message } = (await response.json()) as VehicleTypeResponse;

    if (!response.ok) {
      return {
        updateVehicleTypeError: {
          updateVehicleTypeErrorMessage:
            message || "Não foi possível atualizar o tipo de veículo.",
        },
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("vehicle-type/update-vehicle-type", error);
    return {
      updateVehicleTypeError: {
        updateVehicleTypeErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar o tipo do veículo.",
      },
    };
  }
};

export { handleUpdateVehicleType };
