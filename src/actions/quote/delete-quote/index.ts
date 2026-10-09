"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface DeleteQuoteProps {
  quoteId: string;
}

interface DeleteQuoteResponse {
  message: string;
}

const handleDeleteQuote = async ({ quoteId }: DeleteQuoteProps) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      deleteQuoteError: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const deleteQuote = `${process.env.HTTP_REQUEST}/quote/delete-quote/${quoteId}`;

  try {
    const response = await apiFetch(deleteQuote, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as DeleteQuoteResponse;

    if (!response.ok) {
      return { deleteQuoteError: message || refusalMessage(response.status) };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("quote/delete-quote", error);
    return {
      deleteQuoteError:
        "Ocorreu um erro inesperado ao tentar deletar o orçamento.",
    };
  }
};

export { handleDeleteQuote };
