"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { createUserSchema } from "@/schemas/create-user-schema";
import { apiFetch } from "@/lib/api-fetch";

interface CreateUserProps {
  message: string;
}

const handleCreateUser = async (state: any, createUserValues: FormData) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      createUserError: {
        createUserErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (createUserValues.type === "RESET") {
    return {};
  }

  const createUser = `${process.env.HTTP_REQUEST}/user/create-user`;

  const userValues = Object.fromEntries(createUserValues.entries());
  const createUserValidation = createUserSchema.safeParse(userValues);

  if (createUserValidation.error) {
    const formatError = createUserValidation.error.flatten();

    return {
      createUserError: formatError.fieldErrors,
    };
  }

  const userData = createUserValidation.data;

  try {
    const response = await apiFetch(createUser, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    const { message } = (await response.json()) as CreateUserProps;

    if (!response.ok) {
      return {
        createUserError: {
          createUserErrorMessage: message || refusalMessage(response.status),
        },
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("user/create-user", error);
    return {
      createUserError: {
        createUserErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar o usuário.",
      },
    };
  }
};

export { handleCreateUser };
