"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { updateQuoteStatusSchema } from "@/schemas/update-quote-status-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";
import { revalidateTagName } from "@/actions/revalidate";

interface UpdateQuoteStatusResponse {
  message: string;
}

const handleUpdateQuoteStatus = async (
  state: any,
  updateQuoteValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      updateQuoteError: {
        updateQuoteErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (updateQuoteValues.type === "RESET") {
    return {};
  }

  const quoteId = updateQuoteValues.get("quoteId");
  const updateQuoteStatus = `${process.env.HTTP_REQUEST}/quote/update-quote-status/${quoteId}`;

  const quoteValues = Object.fromEntries(updateQuoteValues.entries());
  const updateQuoteValidation = updateQuoteStatusSchema.safeParse(quoteValues);

  if (!updateQuoteValidation.success) {
    const formatError = updateQuoteValidation.error.flatten();

    return {
      updateQuoteError: formatError.fieldErrors,
    };
  }

  const quoteData = updateQuoteValidation.data;

  try {
    const response = await apiFetch(updateQuoteStatus, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(quoteData),
    });

    const { message } = (await response.json()) as UpdateQuoteStatusResponse;

    if (!response.ok) {
      return {
        updateQuoteError: {
          updateQuoteErrorMessage: message || refusalMessage(response.status),
        },
      };
    }

    // Re-renders the screen in this same response: the client no longer
    // asks for it in a second request.
    await revalidateTagName("update-quote-status");

    return { successMessage: message };
  } catch (error) {
    logActionError("quote/update-quote-status", error);
    return {
      updateQuoteError: {
        updateQuoteErrorMessage:
          "Ocorreu um erro inesperado ao atualizar o status do orçamento.",
      },
    };
  }
};

export { handleUpdateQuoteStatus };
