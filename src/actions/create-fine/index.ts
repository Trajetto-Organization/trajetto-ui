"use server";

import { createUpdateFineSchema } from "@/schemas/create-update-fine-schema";
import { getCookies } from "../cookies";

interface CreateFineProps {
  message: string;
}

const handleCreateFine = async (state: any, createFineValues: FormData) => {
  if (createFineValues.type === "RESET") {
    return {};
  }

  const businessId = createFineValues.get("businessId");

  const createFine = `${process.env.HTTP_REQUEST}/fines/create-fine/${businessId}`;
  const tokenAccess = await getCookies("tkey");

  const fineValues = Object.fromEntries(createFineValues.entries());
  const createFineValidation = createUpdateFineSchema.safeParse(fineValues);

  if (createFineValidation.error) {
    const formatError = createFineValidation.error.flatten();
    return {
      createFineError: formatError.fieldErrors,
    };
  }

  const fineData = createFineValidation.data;

  try {
    const response = await fetch(createFine, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(fineData),
    });

    const { message } = (await response.json()) as CreateFineProps;

    if (!response.ok && message) {
      return {
        createFineError: { createFineErrorMessage: message },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      createFineError: {
        createFineErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar a multa.",
      },
    };
  }
};

export { handleCreateFine };
