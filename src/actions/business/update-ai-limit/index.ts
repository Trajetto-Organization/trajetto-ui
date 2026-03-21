"use server";

import { getCookies } from "../../cookies";
import { updateAILimitSchema } from "@/schemas/update-ai-limit-schema";

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
    const response = await fetch(
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

    if (!response.ok && message) {
      return {
        updateAILimitError: { updateAILimitErrorMessage: message },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      updateAILimitError: {
        updateAILimitErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar o limite de IA.",
      },
    };
  }
};

export { handleUpdateAILimit };
