"use server";

import { createUpdateVehicleTypeSchema } from "@/schemas/create-update-vehicle-type-schema";
import { getCookies } from "../../cookies";

interface CreateVehicleTypeProps {
  message: string;
}

const handleCreateVehicleType = async (
  state: any,
  createVehicleTypeValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      createVehicleTypeError: {
        createVehicleTypeErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (createVehicleTypeValues.type === "RESET") {
    return {};
  }

  const businessId = createVehicleTypeValues.get("businessId");
  const createVehicleType = `${process.env.HTTP_REQUEST}/vehicle-type/create-vehicle-type/${businessId}`;

  const vehicleTypeValues = Object.fromEntries(
    createVehicleTypeValues.entries(),
  );
  const createVehicleTypeValidation =
    createUpdateVehicleTypeSchema.safeParse(vehicleTypeValues);

  if (createVehicleTypeValidation.error) {
    const formatError = createVehicleTypeValidation.error.flatten();
    return {
      createVehicleTypeError: formatError.fieldErrors,
    };
  }

  const vehicleTypeData = createVehicleTypeValidation.data;

  try {
    const response = await fetch(createVehicleType, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(vehicleTypeData),
    });

    const { message } = (await response.json()) as CreateVehicleTypeProps;

    if (!response.ok && message) {
      return {
        createVehicleTypeError: { createVehicleTypeErrorMessage: message },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      createVehicleTypeError: {
        createVehicleTypeErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar um tipo de veículo.",
      },
    };
  }
};

export { handleCreateVehicleType };
