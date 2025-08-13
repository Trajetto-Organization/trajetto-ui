"use server";

import { createUpdateFuelSchema } from "@/schemas/create-update-fuel-schema";
import { getCookies } from "../cookies";

interface UpdateFuelProps {
  message: string;
}

const handleUpdateFuel = async (state: any, updateFuelValues: FormData) => {
  if (updateFuelValues.type === "RESET") {
    return {};
  }

  const businessId = updateFuelValues.get("businessId");
  const fuelId = updateFuelValues.get("fuelId");

  const updateFuel = `${process.env.HTTP_REQUEST}/fuel/update-fuel/${fuelId}/business/${businessId}`;
  const tokenAccess = await getCookies("tkey");

  const fuelValues = Object.fromEntries(updateFuelValues.entries());
  const updateFuelValidation = createUpdateFuelSchema.safeParse(fuelValues);

  if (updateFuelValidation.error) {
    const formatError = updateFuelValidation.error.flatten();

    return {
      updateFuelError: formatError.fieldErrors,
    };
  }

  const fuelData = updateFuelValidation.data;

  try {
    const response = await fetch(updateFuel, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(fuelData),
    });

    const { message } = (await response.json()) as UpdateFuelProps;

    if (!response.ok && message) {
      return {
        updateFuelError: { updateFuelErrorMessage: message },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      updateFuelError: {
        updateFuelErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar o abastecimento.",
      },
    };
  }
};

export { handleUpdateFuel };
