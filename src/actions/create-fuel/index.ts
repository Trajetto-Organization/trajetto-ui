"use server";

import { createUpdateFuelSchema } from "@/schemas/create-update-fuel-schema";
import { getCookies } from "../cookies";

interface CreateFuelProps {
  message: string;
}

const handleCreateFuel = async (state: any, createFuelValues: FormData) => {
  if (createFuelValues.type === "RESET") {
    return {};
  }

  const businessId = createFuelValues.get("businessId");

  const createFuel = `${process.env.HTTP_REQUEST}/fuel/create-fuel/${businessId}`;
  const tokenAccess = await getCookies("tkey");

  const fuelValues = Object.fromEntries(createFuelValues.entries());
  const createFuelValidation = createUpdateFuelSchema.safeParse(fuelValues);

  if (createFuelValidation.error) {
    const formatError = createFuelValidation.error.flatten();

    return {
      createFuelError: formatError.fieldErrors,
    };
  }

  const fuelData = createFuelValidation.data;

  try {
    const response = await fetch(createFuel, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(fuelData),
    });

    const { message } = (await response.json()) as CreateFuelProps;

    if (!response.ok && message) {
      return {
        createFuelError: { createFuelErrorMessage: message },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      createFuelError: {
        createFuelErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar o abastecimento.",
      },
    };
  }
};

export { handleCreateFuel };
