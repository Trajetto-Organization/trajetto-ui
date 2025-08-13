"use server";

import { createUpdateVehicleSchema } from "@/schemas/create-update-vehicle-schema";
import { getCookies } from "../cookies";

import { parseJwt } from "@/lib/decode-jwt";

interface VehicleProps {
  message: string;
}

const handleUpdateVehicle = async (
  state: any,
  updateVehicleValues: FormData,
) => {
  if (updateVehicleValues.type === "RESET") {
    return {};
  }

  const businessId = updateVehicleValues.get("businessId");
  const vehicleId = updateVehicleValues.get("vehicleId");

  const updateVehicle = `${process.env.HTTP_REQUEST}/vehicle/update-vehicle/${vehicleId}/business/${businessId}`;
  const tokenAccess = await getCookies("tkey");

  let vehicleValues = Object.fromEntries(updateVehicleValues.entries());

  // Check user role from token
  const decoded = parseJwt(tokenAccess as string);
  const userRole = decoded?.role;

  const updateVehicleValidation =
    createUpdateVehicleSchema.safeParse(vehicleValues);

  if (updateVehicleValidation.error) {
    const formatError = updateVehicleValidation.error.flatten();

    return {
      updateVehicleError: formatError.fieldErrors,
    };
  }

  let vehicleData: Partial<typeof updateVehicleValidation.data> =
    updateVehicleValidation.data;

  if (userRole !== "MASTER") {
    const { current_mileage, ...rest } = vehicleData;
    vehicleData = rest;
  }

  try {
    const response = await fetch(updateVehicle, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(vehicleData),
    });

    const { message } = (await response.json()) as VehicleProps;

    if (!response.ok && message) {
      return {
        updateVehicleError: { updateVehicleErrorMessage: message },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      updateVehicleError: {
        updateVehicleErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar o veículo.",
      },
    };
  }
};

export { handleUpdateVehicle };
