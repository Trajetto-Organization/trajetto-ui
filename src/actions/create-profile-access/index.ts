"use server";

import { createUpdateProfileAccessSchema } from "@/schemas/create-update-profile-access-schema";
import { getCookies } from "../cookies";

interface CreateProfileAccessProps {
  message: string;
}

const handleCreateProfileAccess = async (
  state: any,
  createProfileAccessValues: FormData,
) => {
  if (createProfileAccessValues.type === "RESET") {
    return {};
  }

  const createProfileAccess = `${process.env.HTTP_REQUEST}/profile-access/create-profile-access`;
  const tokenAccess = await getCookies("tkey");

  const profileAccessValues = Object.fromEntries(
    createProfileAccessValues.entries(),
  );

  const createProfileAccessValidation =
    createUpdateProfileAccessSchema.safeParse(profileAccessValues);

  if (createProfileAccessValidation.error) {
    const formatError = createProfileAccessValidation.error.flatten();

    return {
      createProfileAccessError: formatError.fieldErrors,
    };
  }

  const profileAccessData = createProfileAccessValidation.data;

  try {
    const response = await fetch(createProfileAccess, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(profileAccessData),
    });

    const { message } = (await response.json()) as CreateProfileAccessProps;

    if (!response.ok && message) {
      return {
        createProfileAccessError: { createProfileAccessErrorMessage: message },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      createProfileAccessError: {
        createProfileAccessErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar o perfil de acesso.",
      },
    };
  }
};

export { handleCreateProfileAccess };
