"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { headers } from "next/headers";

import { apiForwardingHeaders } from "@/lib/api-forwarding";
import { validateForgotFormSchema } from "@/schemas/forgot-password-schema";
import { validateTurnstile } from "../../validate-turnstile";
import { apiFetch } from "@/lib/api-fetch";

const handleForgotPassword = async (
  state: any,
  forgotPasswordValues: FormData,
) => {
  const forgotPassword = `${process.env.HTTP_REQUEST}/user/forgot/password`;
  const forgotPasswordValidation = validateForgotFormSchema.safeParse({
    email: forgotPasswordValues.get("email"),
  });

  if (forgotPasswordValidation.error) {
    const formatError = forgotPasswordValidation.error.flatten();
    return {
      forgotPasswordError: formatError.fieldErrors,
    };
  }

  if (process.env.NODE_ENV === "production") {
    const turnstileToken = forgotPasswordValues.get("turnstileToken") as string;
    const turnstileOk = await validateTurnstile(turnstileToken);

    if (!turnstileOk) {
      return {
        forgotPasswordError: {
          forgotPasswordErrorMessage: "Falha no desafio de segurança.",
        },
      };
    }
  }

  const { email } = forgotPasswordValidation.data;

  try {
    const response = await apiFetch(forgotPassword, {
      credentials: "include",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Anonymous route limited per address: say which browser this is for.
        ...apiForwardingHeaders(headers()),
      },
      body: JSON.stringify({ email }),
    });

    const { message } = await response.json();

    if (!response.ok) {
      return {
        forgotPasswordError: {
          forgotPasswordErrorMessage:
            message || refusalMessage(response.status),
        },
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("user/forgot-password-user", error);
    return {
      forgotPasswordError: {
        forgotPasswordErrorMessage:
          "Ocorreu um erro inesperado ao tentar enviar o e-mail.",
      },
    };
  }
};

export { handleForgotPassword };
