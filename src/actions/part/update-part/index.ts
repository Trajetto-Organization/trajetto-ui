"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { createUpdatePartSchema } from "@/schemas/create-update-part-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";
import { revalidateTagName } from "@/actions/revalidate";

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
    const response = await apiFetch(updatePart, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(partData),
    });

    const { message } = (await response.json()) as PartProps;

    if (!response.ok) {
      return {
        updatePartError: {
          updatePartErrorMessage: message || refusalMessage(response.status),
        },
      };
    }

    // Re-renders the screen in this same response: the client no longer
    // asks for it in a second request.
    await revalidateTagName("update-part");

    return { successMessage: message };
  } catch (error) {
    logActionError("part/update-part", error);
    return {
      updatePartError: {
        updatePartErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar a peça.",
      },
    };
  }
};

export { handleUpdatePart };
