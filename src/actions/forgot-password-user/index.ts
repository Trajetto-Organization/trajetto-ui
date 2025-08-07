"use server";

import { validateForgotFormSchema } from "@/schemas/forgot-password-schema";

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
