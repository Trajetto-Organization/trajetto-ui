"use server";

import { createUpdateFuelTypeSchema } from "@/schemas/create-update-fuel-type-schema";
import { getCookies } from "../cookies";

interface VehicleTypeProps {
  message: string;
}

const handleUpdateFuelType = async (
  state: any,
  updateFuelTypeValues: FormData,
) => {
  if (updateFuelTypeValues.type === "RESET") {
    return {};
  }

  const fuelTypeId = updateFuelTypeValues.get("fuelTypeId");
  const businessId = updateFuelTypeValues.get("businessId");

  const updateFuelType = `${process.env.HTTP_REQUEST}/fuel-type/update-fuel-type/${fuelTypeId}/business/${businessId}`;
  const tokenAccess = await getCookies("tkey");

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
    const response = await fetch(updateFuelType, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(fuelTypeData),
    });

    const { message } = (await response.json()) as VehicleTypeProps;

    if (!response.ok && message) {
      return {
        updateFuelTypeError: { updateFuelTypeErrorMessage: message },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      updateFuelTypeError: {
        updateFuelTypeErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar o tipo do combustível.",
      },
    };
  }
};

export { handleUpdateFuelType };
