"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { createUpdateOccurrenceTypeSchema } from "@/schemas/create-update-occurrence-type-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";
import { revalidateTagName } from "@/actions/revalidate";

interface UpdateOccurrenceTypeProps {
  message: string;
}

const handleUpdateOccurrenceType = async (
  state: any,
  updateOccurrenceTypeValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      updateOccurrenceTypeError: {
        updateOccurrenceTypeErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (updateOccurrenceTypeValues.type === "RESET") {
    return {};
  }

  const businessId = updateOccurrenceTypeValues.get("businessId");
  const occurrenceTypeId = updateOccurrenceTypeValues.get("occurrenceTypeId");

  const updateOccurrenceType = `${process.env.HTTP_REQUEST}/occurrence-type/update-occurrence-type/${occurrenceTypeId}/business/${businessId}`;

  const occurrenceTypeValues = Object.fromEntries(
    updateOccurrenceTypeValues.entries(),
  );

  const updateOccurrenceTypeValidation =
    createUpdateOccurrenceTypeSchema.safeParse(occurrenceTypeValues);

  if (updateOccurrenceTypeValidation.error) {
    const formatError = updateOccurrenceTypeValidation.error.flatten();

    return {
      updateOccurrenceTypeError: formatError.fieldErrors,
    };
  }

  try {
    const response = await apiFetch(updateOccurrenceType, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateOccurrenceTypeValidation.data),
    });

    const { message } = (await response.json()) as UpdateOccurrenceTypeProps;

    if (!response.ok) {
      return {
        updateOccurrenceTypeError: {
          updateOccurrenceTypeErrorMessage:
            message || refusalMessage(response.status),
        },
      };
    }

    // Re-renders the screen in this same response: the client no longer
    // asks for it in a second request.
    await revalidateTagName("update-occurrence-type");

    return { successMessage: message };
  } catch (error) {
    logActionError("occurrence-type/update-occurrence-type", error);
    return {
      updateOccurrenceTypeError: {
        updateOccurrenceTypeErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar o tipo de ocorrência.",
      },
    };
  }
};

export { handleUpdateOccurrenceType };
