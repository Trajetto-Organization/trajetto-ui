"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { validateUserNameFormSchema } from "@/schemas/update-username-schema";

import { getCookies } from "../../cookies";
import { revalidateTagName } from "../../revalidate";
import { apiFetch } from "@/lib/api-fetch";

interface UpdateUserNameProps {
  message: string;
}

const handleUpdateUserName = async (state: any, userNameValues: FormData) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      userNameError: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const updateUserName = `${process.env.HTTP_REQUEST}/user/username`;
  const userNameValidation = validateUserNameFormSchema.safeParse({
    userName: userNameValues.get("userName"),
  });

  if (userNameValidation.error) {
    const formatError = userNameValidation.error.flatten();
    return {
      userNameError: formatError.fieldErrors.userName,
    };
  }

  const { userName } = userNameValidation.data;

  try {
    const response = await apiFetch(updateUserName, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: userName }),
    });

    const { message } = (await response.json()) as UpdateUserNameProps;

    if (!response.ok) {
      return { userNameError: message || refusalMessage(response.status) };
    }

    await revalidateTagName("update-username");
    return { successMessage: message };
  } catch (error) {
    logActionError("user/update-username", error);
    return {
      userNameError:
        "Ocorreu um erro inesperado ao tentar atualizar seu nome de usuário! Por favor, tente novamente.",
    };
  }
};

export { handleUpdateUserName };
