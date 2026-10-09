"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { createUpdateProfileAccessSchema } from "@/schemas/create-update-profile-access-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface EditBusinessProps {
  message: string;
}

const handleUpdateProfileAccess = async (
  state: any,
  updateProfileAccessValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      updateProfileAccessError: {
        updateProfileAccessErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (updateProfileAccessValues.type === "RESET") {
    return {};
  }

  const profileAccessId = updateProfileAccessValues.get("profileAccessId");
  const updateProfileAccess = `${process.env.HTTP_REQUEST}/profile-access/update-profile-access/${profileAccessId}`;

  const profileAccessValues = Object.fromEntries(
    updateProfileAccessValues.entries(),
  );
  const updateProfileAccessValidation =
    createUpdateProfileAccessSchema.safeParse(profileAccessValues);

  if (updateProfileAccessValidation.error) {
    const formatError = updateProfileAccessValidation.error.flatten();
    return {
      updateProfileAccessError: formatError.fieldErrors,
    };
  }

  const businessData = updateProfileAccessValidation.data;

  try {
    const response = await apiFetch(updateProfileAccess, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(businessData),
    });

    const { message } = (await response.json()) as EditBusinessProps;

    if (!response.ok) {
      return {
        updateProfileAccessError: {
          updateProfileAccessErrorMessage:
            message || refusalMessage(response.status),
        },
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("profile-access/update-profile-access", error);
    return {
      updateProfileAccessError: {
        updateProfileAccessErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar o perfil de acesso.",
      },
    };
  }
};

export { handleUpdateProfileAccess };
