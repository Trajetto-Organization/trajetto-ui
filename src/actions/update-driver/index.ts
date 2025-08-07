"use server";

import { createUpdateDriverSchema } from "@/schemas/create-update-driver-schema";
import { getCookies } from "../cookies";

interface DriverProps {
  message: string;
}

const handleUpdateDriver = async (state: any, updateDriverValues: FormData) => {
  if (updateDriverValues.type === "RESET") {
    return {};
  }

  const businessId = updateDriverValues.get("businessId");
  const driverId = updateDriverValues.get("driverId");

  const updateDriver = `${process.env.HTTP_REQUEST}/driver/update-driver/${driverId}/business/${businessId}`;
  const tokenAccess = await getCookies("tkey");

  const driverValues = Object.fromEntries(updateDriverValues.entries());

  const updateDriverValidation =
    createUpdateDriverSchema.safeParse(driverValues);

  if (updateDriverValidation.error) {
    const formatError = updateDriverValidation.error.flatten();

    return {
      updateDriverError: formatError.fieldErrors,
    };
  }

  const driverData = updateDriverValidation.data;

  try {
    const response = await fetch(updateDriver, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(driverData),
    });

    const { message } = (await response.json()) as DriverProps;

    if (!response.ok && message) {
      return {
        updateDriverError: { updateDriverErrorMessage: message },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      updateDriverError: {
        updateDriverErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar o motorista.",
      },
    };
  }
};

export { handleUpdateDriver };
