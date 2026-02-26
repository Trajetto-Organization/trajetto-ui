"use server";

import { validateUserNameFormSchema } from "@/schemas/update-username-schema";

import { getCookies } from "../../cookies";
import { revalidateTagName } from "../../revalidate";

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
    const response = await fetch(updateUserName, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: userName }),
    });

    const { message } = (await response.json()) as UpdateUserNameProps;

    if (!response.ok && message) {
      return { userNameError: message };
    }

    await revalidateTagName("update-username");
    return { successMessage: message };
  } catch (error) {
    return {
      userNameError:
        "Ocorreu um erro inesperado ao tentar atualizar seu nome de usuário! Por favor, tente novamente.",
    };
  }
};

export { handleUpdateUserName };
