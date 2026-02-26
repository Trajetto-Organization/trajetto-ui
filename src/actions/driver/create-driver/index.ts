"use server";

import { createUpdateDriverSchema } from "@/schemas/create-update-driver-schema";
import { getCookies } from "../../cookies";

interface CreateDriverProps {
  message: string;
}

const handleCreateDriver = async (state: any, createDriverValues: FormData) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      createDriverError: {
        createDriverErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (createDriverValues.type === "RESET") {
    return {};
  }

  const businessId = createDriverValues.get("businessId");

  const createDriver = `${process.env.HTTP_REQUEST}/driver/create-driver/${businessId}`;

  const driverValues = Object.fromEntries(createDriverValues.entries());
  const createDriverValidation =
    createUpdateDriverSchema.safeParse(driverValues);

  if (createDriverValidation.error) {
    const formatError = createDriverValidation.error.flatten();
    return {
      createDriverError: formatError.fieldErrors,
    };
  }

  const driverData = createDriverValidation.data;

  try {
    const response = await fetch(createDriver, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(driverData),
    });

    const { message } = (await response.json()) as CreateDriverProps;

    if (!response.ok && message) {
      return {
        createDriverError: { createDriverErrorMessage: message },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      createDriverError: {
        createDriverErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar o motorista.",
      },
    };
  }
};

export { handleCreateDriver };
