"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { quoteSchema } from "@/schemas/quote-schema";
import { apiFetch } from "@/lib/api-fetch";

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

  // The API verifies the Turnstile token itself: a bot posting straight to
  // the API skipped the check that used to live only here. Tokens are
  // single-use, so this action must NOT verify it first — the API's
  // siteverify of the same token would then fail. It only forwards it.
  const turnstileToken = formData.get("turnstileToken");

  const quoteDataValidation = {
    ...validation.data,
    ...(typeof turnstileToken === "string" && turnstileToken
      ? { turnstileToken }
      : {}),
  };

  try {
    const response = await apiFetch(createQuote, {
      credentials: "include",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(quoteDataValidation),
    });

    const { message } = await response.json();

    if (!response.ok) {
      return {
        createQuoteError: {
          createQuoteErrorMessage: message || refusalMessage(response.status),
        },
      };
    }

    return {
      successMessage: message,
    };
  } catch (error) {
    logActionError("quote/create-quote", error);
    return {
      createQuoteError: {
        createQuoteErrorMessage:
          "Ocorreu um erro inesperado ao processar sua solicitação. Por favor, tente novamente.",
      },
    };
  }
};

export { handleQuoteSubmit };
