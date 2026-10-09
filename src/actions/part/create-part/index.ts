"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { createUpdatePartSchema } from "@/schemas/create-update-part-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface CreatePartProps {
  message: string;
}

const handleCreatePart = async (state: any, createPartValues: FormData) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      createPartError: {
        createPartErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (createPartValues.type === "RESET") {
    return {};
  }

  const businessId = createPartValues.get("businessId");
  const createPart = `${process.env.HTTP_REQUEST}/part/create-part/${businessId}`;

  const partValues = Object.fromEntries(createPartValues.entries());
  const createPartValidation = createUpdatePartSchema.safeParse(partValues);

  if (createPartValidation.error) {
    const formatError = createPartValidation.error.flatten();

    return {
      createPartError: formatError.fieldErrors,
    };
  }

  const partData = createPartValidation.data;

  try {
    const response = await apiFetch(createPart, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(partData),
    });

    const { message } = (await response.json()) as CreatePartProps;

    if (!response.ok) {
      return {
        createPartError: {
          createPartErrorMessage: message || refusalMessage(response.status),
        },
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("part/create-part", error);
    return {
      createPartError: {
        createPartErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar a peça.",
      },
    };
  }
};

export { handleCreatePart };
