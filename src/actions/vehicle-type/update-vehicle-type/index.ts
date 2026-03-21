"use server";

import { createUpdateVehicleTypeSchema } from "@/schemas/create-update-vehicle-type-schema";
import { getCookies } from "../../cookies";

interface VehicleTypeProps {
  message: string;
}

const handleUpdateVehicleType = async (
  state: any,
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

  if (updateVehicleTypeValues.type === "RESET") {
    return {};
  }

  const vehicleTypeId = updateVehicleTypeValues.get("vehicleTypeId");
  const businessId = updateVehicleTypeValues.get("businessId");

  const updateVehicleType = `${process.env.HTTP_REQUEST}/vehicle-type/update-vehicle-type/${vehicleTypeId}/business/${businessId}`;
  const vehicleTypeValues = Object.fromEntries(
    updateVehicleTypeValues.entries(),
  );

  const updateVehicleTypeValidation =
    createUpdateVehicleTypeSchema.safeParse(vehicleTypeValues);

  if (updateVehicleTypeValidation.error) {
    const formatError = updateVehicleTypeValidation.error.flatten();

    return {
      updateVehicleTypeError: formatError.fieldErrors,
    };
  }

  const vehicleTypeData = updateVehicleTypeValidation.data;

  try {
    const response = await fetch(updateVehicleType, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(vehicleTypeData),
    });

    const { message } = (await response.json()) as VehicleTypeProps;

    if (!response.ok && message) {
      return {
        updateVehicleTypeError: { updateVehicleTypeErrorMessage: message },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      updateVehicleTypeError: {
        updateVehicleTypeErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar o tipo do veículo.",
      },
    };
  }
};

export { handleUpdateVehicleType };
