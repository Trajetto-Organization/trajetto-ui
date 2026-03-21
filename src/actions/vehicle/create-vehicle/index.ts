"use server";

import { createUpdateVehicleSchema } from "@/schemas/create-update-vehicle-schema";
import { getCookies } from "../../cookies";

interface CreateVehicleProps {
  message: string;
}

const handleCreateVehicle = async (
  state: any,
  createVehicleValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      createVehicleError: {
        createVehicleErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (createVehicleValues.type === "RESET") {
    return {};
  }

  const businessId = createVehicleValues.get("businessId");
  const createVehicle = `${process.env.HTTP_REQUEST}/vehicle/create-vehicle/${businessId}`;

  const vehicleTypeValues = Object.fromEntries(createVehicleValues.entries());
  const createVehicleValidation =
    createUpdateVehicleSchema.safeParse(vehicleTypeValues);

  if (createVehicleValidation.error) {
    const formatError = createVehicleValidation.error.flatten();
    return {
      createVehicleError: formatError.fieldErrors,
    };
  }

  const vehicleData = createVehicleValidation.data;

  try {
    const response = await fetch(createVehicle, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(vehicleData),
    });

    const { message } = (await response.json()) as CreateVehicleProps;

    if (!response.ok && message) {
      return {
        createVehicleError: { createVehicleErrorMessage: message },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      createVehicleError: {
        createVehicleErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar o veículo.",
      },
    };
  }
};

export { handleCreateVehicle };
