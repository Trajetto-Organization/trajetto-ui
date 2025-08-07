"use server";

import { updateQuoteStatusSchema } from "@/schemas/update-quote-status-schema";
import { getCookies } from "../cookies";

interface UpdateQuoteStatusResponse {
  message: string;
}

const handleUpdateQuoteStatus = async (
  state: any,
  updateQuoteValues: FormData,
) => {
  if (updateQuoteValues.get("type") === "RESET") {
    return {};
  }

  const quoteId = updateQuoteValues.get("quoteId");

  const updateQuoteStatus = `${process.env.HTTP_REQUEST}/quote/update-quote-status/${quoteId}`;
  const tokenAccess = await getCookies("tkey");

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
    const response = await fetch(updateQuoteStatus, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(quoteData),
    });

    const { message } = (await response.json()) as UpdateQuoteStatusResponse;

    if (!response.ok && message) {
      return { updateQuoteError: { updateQuoteErrorMessage: message } };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      updateQuoteError: {
        updateQuoteErrorMessage:
          "Ocorreu um erro inesperado ao atualizar o status do orçamento.",
      },
    };
  }
};

export { handleUpdateQuoteStatus };
