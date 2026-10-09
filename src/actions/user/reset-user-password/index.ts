"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { headers } from "next/headers";

import { apiForwardingHeaders } from "@/lib/api-forwarding";
import { validateResetUserPasswordFormSchema } from "@/schemas/reset-password-schema";
import { apiFetch } from "@/lib/api-fetch";

interface ResetPasswordProps {
  message: string;
}

const handleResetPassword = async (
  state: any,
  resetPasswordValues: FormData,
) => {
  const token = resetPasswordValues.get("token");

  // FormData may carry a File here, and an unencoded string added query
  // parameters of the caller's choosing to the API call.
  if (typeof token !== "string" || !token) {
    return {
      resetPasswordError: {
        resetPasswordErrorMessage: "Token ausente!",
      },
    };
  }

  const resetPassword = `${process.env.HTTP_REQUEST}/user/reset/password?token=${encodeURIComponent(token)}`;
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
    const response = await apiFetch(resetPassword, {
      credentials: "include",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Anonymous route limited per address: say which browser this is for.
        ...apiForwardingHeaders(headers()),
      },
      body: JSON.stringify({ password: confirm_password }),
    });

    const { message } = (await response.json()) as ResetPasswordProps;

    if (!response.ok) {
      return {
        resetPasswordError: {
          resetPasswordErrorMessage: message || refusalMessage(response.status),
        },
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("user/reset-user-password", error);
    return {
      resetPasswordError: {
        resetPasswordErrorMessage:
          "Ocorreu um erro inesperado ao tentar redefinir sua senha.",
      },
    };
  }
};

export { handleResetPassword };
