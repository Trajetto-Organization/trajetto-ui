"use server";

import { logActionError } from "@/lib/log-action-error";
import { updateVehicleSchema } from "@/schemas/create-update-vehicle-schema";
import { getCookies } from "../../cookies";

import { parseJwt } from "@/lib/decode-jwt";
import { apiFetch } from "@/lib/api-fetch";

interface VehicleResponse {
  code?: string;
  message: string;
}

/**
 * Saves an edit. The form sends ONLY the fields that changed (FLEET-VEH-2,
 * VEH-8): the full resend failed on one-axle vehicles and wrote back an
 * odometer read when the dialog opened, over a refuelling made since.
 */
const handleUpdateVehicle = async (
  state: unknown,
  updateVehicleValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      updateVehicleError: {
        updateVehicleErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  const businessId = updateVehicleValues.get("businessId");
  const vehicleId = updateVehicleValues.get("vehicleId");

  const {
    businessId: _business,
    vehicleId: _vehicle,
    ...changes
  } = Object.fromEntries(updateVehicleValues.entries());

  const updateVehicleValidation = updateVehicleSchema.safeParse(changes);

  if (!updateVehicleValidation.success) {
    return {
      updateVehicleError: updateVehicleValidation.error.flatten().fieldErrors,
    };
  }

  let vehicleData: Record<string, unknown> = updateVehicleValidation.data;

  // Only a MASTER corrects the odometer; the API refuses it from anyone
  // else, and the field is read-only for them anyway.
  const role = parseJwt(tokenAccess as string)?.role;

  if (role !== "MASTER") {
    const { current_mileage: _mileage, ...rest } = vehicleData;
    vehicleData = rest;
  }

  const url = `${process.env.HTTP_REQUEST}/vehicle/update-vehicle/${vehicleId}/business/${businessId}`;

  try {
    const response = await apiFetch(url, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(vehicleData),
    });

    const { message } = (await response.json()) as VehicleResponse;

    if (!response.ok) {
      return {
        updateVehicleError: {
          updateVehicleErrorMessage:
            message || "Não foi possível atualizar o veículo.",
        },
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("vehicle/update-vehicle", error);
    return {
      updateVehicleError: {
        updateVehicleErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar o veículo.",
      },
    };
  }
};

export { handleUpdateVehicle };
