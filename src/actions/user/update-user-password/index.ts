"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { validateUserPasswordFormSchema } from "@/schemas/update-user-password";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface UpdateUserNameProps {
  message: string;
}

const handleUpdateUserPassword = async (
  state: any,
  userPasswordValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      userPasswordError: {
        userPasswordErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  const updatePassword = `${process.env.HTTP_REQUEST}/user/password`;
  const userPasswordValidation = validateUserPasswordFormSchema.safeParse({
    current_password: userPasswordValues.get("current_password"),
    new_password: userPasswordValues.get("new_password"),
    confirm_new_password: userPasswordValues.get("confirm_new_password"),
  });

  if (userPasswordValidation.error) {
    const formatError = userPasswordValidation.error.flatten();
    return {
      userPasswordError: formatError.fieldErrors,
    };
  }

  const { current_password, confirm_new_password } =
    userPasswordValidation.data;
  const updateUserPassword = {
    currentPassword: current_password,
    newPassword: confirm_new_password,
  };

  try {
    const response = await apiFetch(updatePassword, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateUserPassword),
    });

    const { message } = (await response.json()) as UpdateUserNameProps;

    if (!response.ok) {
      return {
        userPasswordError: {
          userPasswordErrorMessage: message || refusalMessage(response.status),
        },
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("user/update-user-password", error);
    return {
      userPasswordError: {
        userPasswordErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar sua senha! Por favor, tente novamente.",
      },
    };
  }
};

export { handleUpdateUserPassword };
