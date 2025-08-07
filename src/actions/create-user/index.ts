"use server";

import { getCookies } from "../cookies";
import { createUserSchema } from "@/schemas/create-user-schema";

interface CreateUserProps {
  message: string;
}

const handleCreateUser = async (state: any, createUserValues: FormData) => {
  if (createUserValues.type === "RESET") {
    return {};
  }

  const createUser = `${process.env.HTTP_REQUEST}/user/create-user`;
  const tokenAccess = await getCookies("tkey");

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
    const response = await fetch(createUser, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    const { message } = (await response.json()) as CreateUserProps;

    if (!response.ok && message) {
      return {
        createUserError: { createUserErrorMessage: message },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      createUserError: {
        createUserErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar o usuário.",
      },
    };
  }
};

export { handleCreateUser };
