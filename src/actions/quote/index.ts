"use server";

import { quoteSchema } from "@/schemas/quote-schema";

const handleQuoteSubmit = async (state: any, formData: FormData) => {
  if (formData.type === "RESET") {
    return {};
  }

  const createQuote = `${process.env.HTTP_REQUEST}/quote/create-quote`;

  const quoteData = Object.fromEntries(formData.entries());
  const validation = quoteSchema.safeParse(quoteData);

  if (validation.error) {
    return {
      createQuoteError: validation.error.flatten().fieldErrors,
    };
  }

  const quoteDataValidation = validation.data;

  try {
    const response = await fetch(createQuote, {
      credentials: "include",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(quoteDataValidation),
    });

    const { message } = await response.json();

    if (!response.ok && message) {
      return {
        createQuoteError: { createQuoteErrorMessage: message },
      };
    }

    return {
      successMessage: message,
    };
  } catch (error) {
    return {
      createQuoteError: {
        createQuoteErrorMessage:
          "Ocorreu um erro inesperado ao processar sua solicitação. Por favor, tente novamente.",
      },
    };
  }
};

export { handleQuoteSubmit };
