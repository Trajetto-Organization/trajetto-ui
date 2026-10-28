"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { createUpdateProfileAccessSchema } from "@/schemas/create-update-profile-access-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";
import { revalidateTagName } from "@/actions/revalidate";

interface CreateProfileAccessProps {
  message: string;
}

const handleCreateProfileAccess = async (
  state: any,
  createProfileAccessValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      createProfileAccessError: {
        createProfileAccessErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (createProfileAccessValues.type === "RESET") {
    return {};
  }

  const createProfileAccess = `${process.env.HTTP_REQUEST}/profile-access/create-profile-access`;

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
    const response = await apiFetch(createProfileAccess, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(profileAccessData),
    });

    const { message } = (await response.json()) as CreateProfileAccessProps;

    if (!response.ok) {
      return {
        createProfileAccessError: {
          createProfileAccessErrorMessage:
            message || refusalMessage(response.status),
        },
      };
    }

    // Re-renders the screen in this same response: the client no longer
    // asks for it in a second request.
    await revalidateTagName("create-profile-access");

    return { successMessage: message };
  } catch (error) {
    logActionError("profile-access/create-profile-access", error);
    return {
      createProfileAccessError: {
        createProfileAccessErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar o perfil de acesso.",
      },
    };
  }
};

export { handleCreateProfileAccess };
