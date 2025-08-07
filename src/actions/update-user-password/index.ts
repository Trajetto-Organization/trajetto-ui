"use server";

import { validateUserPasswordFormSchema } from "@/schemas/update-user-password";
import { getCookies } from "../cookies";

interface UpdateUserNameProps {
  message: string;
}

const handleUpdateUserPassword = async (
  state: any,
  userPasswordValues: FormData,
) => {
  const updatePassword = `${process.env.HTTP_REQUEST}/user/password`;
  const tokenAccess = await getCookies("tkey");

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
    const response = await fetch(updatePassword, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateUserPassword),
    });

    const { message } = (await response.json()) as UpdateUserNameProps;

    if (!response.ok && message) {
      return { userPasswordError: { userPasswordErrorMessage: message } };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      userPasswordError: {
        userPasswordErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar sua senha! Por favor, tente novamente.",
      },
    };
  }
};

export { handleUpdateUserPassword };
