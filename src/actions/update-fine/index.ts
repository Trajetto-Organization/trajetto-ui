"use server";

import { createUpdateFineSchema } from "@/schemas/create-update-fine-schema";
import { getCookies } from "../cookies";

interface UpdateFineProps {
  message: string;
}

const handleUpdateFine = async (state: any, updateFineValues: FormData) => {
  if (updateFineValues.type === "RESET") {
    return {};
  }

  const fineId = updateFineValues.get("fineId");

  const updateFine = `${process.env.HTTP_REQUEST}/fines/update-fine/${fineId}`;
  const tokenAccess = await getCookies("tkey");

  const fineValues = Object.fromEntries(updateFineValues.entries());
  const updateFineValidation = createUpdateFineSchema.safeParse(fineValues);

  if (updateFineValidation.error) {
    const formatError = updateFineValidation.error.flatten();
    return {
      updateFineError: formatError.fieldErrors,
    };
  }

  const fineData = updateFineValidation.data;

  try {
    const response = await fetch(updateFine, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(fineData),
    });

    const { message } = (await response.json()) as UpdateFineProps;

    if (!response.ok && message) {
      return {
        updateFineError: { updateFineErrorMessage: message },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      updateFineError: {
        updateFineErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar a multa.",
      },
    };
  }
};

export { handleUpdateFine };
