"use server";

import { createUpdateFuelTypeSchema } from "@/schemas/create-update-fuel-type-schema";
import { getCookies } from "../../cookies";

interface CreateFuelTypeProps {
  message: string;
}

const handleCreateFuelType = async (
  state: any,
  createFuelTypeValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      createFuelTypeError: {
        createFuelTypeErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (createFuelTypeValues.type === "RESET") {
    return {};
  }

  const businessId = createFuelTypeValues.get("businessId");

  const createFuelType = `${process.env.HTTP_REQUEST}/fuel-type/create-fuel-type/${businessId}`;

  const fuelTypeValues = Object.fromEntries(createFuelTypeValues.entries());

  const createFuelTypeValidation =
    createUpdateFuelTypeSchema.safeParse(fuelTypeValues);

  if (createFuelTypeValidation.error) {
    const formatError = createFuelTypeValidation.error.flatten();

    return {
      createFuelTypeError: formatError.fieldErrors,
    };
  }

  const fuelTypeData = createFuelTypeValidation.data;

  try {
    const response = await fetch(createFuelType, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(fuelTypeData),
    });

    const { message } = (await response.json()) as CreateFuelTypeProps;

    if (!response.ok && message) {
      return {
        createFuelTypeError: { createFuelTypeErrorMessage: message },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      createFuelTypeError: {
        createFuelTypeErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar um tipo de combustível.",
      },
    };
  }
};

export { handleCreateFuelType };
