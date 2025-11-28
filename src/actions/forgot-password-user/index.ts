"use server";

import { validateForgotFormSchema } from "@/schemas/forgot-password-schema";
import { validateTurnstile } from "../validate-turnstile";

const handleForgotPassword = async (
  state: any,
  forgotPasswordValues: FormData,
) => {
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

  const { email } = forgotPasswordValidation.data;

  try {
    const response = await fetch(forgotPassword, {
      credentials: "include",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const { message } = await response.json();

    if (!response.ok && message) {
      return {
        forgotPasswordError: { forgotPasswordErrorMessage: message },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      forgotPasswordError: {
        forgotPasswordErrorMessage:
          "Ocorreu um erro inesperado ao tentar enviar o e-mail.",
      },
    };
  }
};

export { handleForgotPassword };
