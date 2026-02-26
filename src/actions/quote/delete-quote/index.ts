"use server";

import { getCookies } from "../../cookies";

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
    const response = await fetch(deleteQuote, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as DeleteQuoteResponse;

    if (!response.ok && message) {
      return { deleteQuoteError: message };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      deleteQuoteError:
        "Ocorreu um erro inesperado ao tentar deletar o orçamento.",
    };
  }
};

export { handleDeleteQuote };
