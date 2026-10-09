"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { updateAILimitSchema } from "@/schemas/update-ai-limit-schema";
import { apiFetch } from "@/lib/api-fetch";

interface UpdateAILimitResponse {
  message: string;
}

const handleUpdateAILimit = async (state: any, formData: FormData) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      updateAILimitError: {
        updateAILimitErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (formData.type === "RESET") {
    return {};
  }

  const businessId = formData.get("businessId");
  const values = Object.fromEntries(formData.entries());

  const validation = updateAILimitSchema.safeParse(values);

  if (!validation.success) {
    const formatError = validation.error.flatten();
    return {
      updateAILimitError: formatError.fieldErrors,
    };
  }

  const { ai_analysis_limit } = validation.data;

  try {
    const response = await apiFetch(
      `${process.env.HTTP_REQUEST}/business/update-ai-limit/${businessId}`,
      {
        credentials: "include",
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ai_analysis_limit }),
      },
    );

    const { message } = (await response.json()) as UpdateAILimitResponse;

    if (!response.ok) {
      return {
        updateAILimitError: {
          updateAILimitErrorMessage: message || refusalMessage(response.status),
        },
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("business/update-ai-limit", error);
    return {
      updateAILimitError: {
        updateAILimitErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar o limite de IA.",
      },
    };
  }
};

export { handleUpdateAILimit };
