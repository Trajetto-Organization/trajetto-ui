"use server";

import { createUpdatePartSchema } from "@/schemas/create-update-part-schema";
import { getCookies } from "../../cookies";

interface PartProps {
  message: string;
}

const handleUpdatePart = async (state: any, updatePartValues: FormData) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      updatePartError: {
        updatePartErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (updatePartValues.type === "RESET") {
    return {};
  }

  const partId = updatePartValues.get("partId");
  const businessId = updatePartValues.get("businessId");

  const updatePart = `${process.env.HTTP_REQUEST}/part/update-part/${partId}/business/${businessId}`;

  const partValues = Object.fromEntries(updatePartValues.entries());
  const updatePartValidation = createUpdatePartSchema.safeParse(partValues);

  if (updatePartValidation.error) {
    const formatError = updatePartValidation.error.flatten();

    return {
      updatePartError: formatError.fieldErrors,
    };
  }

  const partData = updatePartValidation.data;

  try {
    const response = await fetch(updatePart, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(partData),
    });

    const { message } = (await response.json()) as PartProps;

    if (!response.ok && message) {
      return {
        updatePartError: { updatePartErrorMessage: message },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      updatePartError: {
        updatePartErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar a peça.",
      },
    };
  }
};

export { handleUpdatePart };
