"use server";

import { createMasterUserSchema } from "@/schemas/create-master-user-schema";
import { getCookies } from "../../cookies";

interface CreateMasterUserProps {
  message: string;
}

const handleCreateMasterUser = async (
  state: any,
  createMasterUserValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      createMasterUserError: {
        createMasterUserErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (createMasterUserValues.type === "RESET") {
    return {};
  }

  const createMasterUser = `${process.env.HTTP_REQUEST}/user/create-master-user`;

  const masterUserValues = Object.fromEntries(createMasterUserValues.entries());
  const createMasterUserValidation =
    createMasterUserSchema.safeParse(masterUserValues);

  if (createMasterUserValidation.error) {
    const formatError = createMasterUserValidation.error.flatten();

    return {
      createMasterUserError: formatError.fieldErrors,
    };
  }

  const masterUserData = createMasterUserValidation.data;

  try {
    const response = await fetch(createMasterUser, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(masterUserData),
    });

    const { message } = (await response.json()) as CreateMasterUserProps;

    if (!response.ok && message) {
      return {
        createMasterUserError: { createMasterUserErrorMessage: message },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      createMasterUserError: {
        createMasterUserErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar o usuário Master.",
      },
    };
  }
};

export { handleCreateMasterUser };
