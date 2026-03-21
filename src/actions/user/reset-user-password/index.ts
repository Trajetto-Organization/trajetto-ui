"use server";

import { validateResetUserPasswordFormSchema } from "@/schemas/reset-password-schema";

interface ResetPasswordProps {
  message: string;
}

const handleResetPassword = async (
  state: any,
  resetPasswordValues: FormData,
) => {
  const token = resetPasswordValues.get("token");

  if (!token) {
    return {
      resetPasswordError: {
        resetPasswordErrorMessage: "Token ausente!",
      },
    };
  }

  const resetPassword = `${process.env.HTTP_REQUEST}/user/reset/password?token=${token}`;
  const resetPasswordValidation = validateResetUserPasswordFormSchema.safeParse(
    {
      password: resetPasswordValues.get("password"),
      confirm_password: resetPasswordValues.get("confirm_password"),
    },
  );

  if (resetPasswordValidation.error) {
    const formatError = resetPasswordValidation.error.flatten();
    return {
      resetPasswordError: formatError.fieldErrors,
    };
  }

  const { confirm_password } = resetPasswordValidation.data;

  try {
    const response = await fetch(resetPassword, {
      credentials: "include",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: confirm_password }),
    });

    const { message } = (await response.json()) as ResetPasswordProps;

    if (!response.ok && message) {
      return {
        resetPasswordError: { resetPasswordErrorMessage: message },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      resetPasswordError: {
        resetPasswordErrorMessage:
          "Ocorreu um erro inesperado ao tentar redefinir sua senha.",
      },
    };
  }
};

export { handleResetPassword };
