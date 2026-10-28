"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { updateMasterUserSchema } from "@/schemas/update-master-user-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";
import { revalidateTagName } from "@/actions/revalidate";

interface UpdateMasterUserProps {
  message: string;
}

const handleUpdateMasterUser = async (
  state: any,
  updateMasterUserValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      updateMasterUserError: {
        updateMasterUserErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (updateMasterUserValues.type === "RESET") {
    return {};
  }

  const masterUserId = updateMasterUserValues.get("masterUserId");
  const updateMasterUser = `${process.env.HTTP_REQUEST}/user/update-master-user/${masterUserId}`;

  const masterUserValues = Object.fromEntries(updateMasterUserValues.entries());
  const updateMasterUserValidation =
    updateMasterUserSchema.safeParse(masterUserValues);

  if (updateMasterUserValidation.error) {
    const formatError = updateMasterUserValidation.error.flatten();
    return {
      updateMasterUserError: formatError.fieldErrors,
    };
  }

  const masterUserData = updateMasterUserValidation.data;

  try {
    const response = await apiFetch(updateMasterUser, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(masterUserData),
    });

    const { message } = (await response.json()) as UpdateMasterUserProps;

    if (!response.ok) {
      return {
        updateMasterUserError: {
          updateMasterUserErrorMessage:
            message || refusalMessage(response.status),
        },
      };
    }

    // Re-renders the screen in this same response: the client no longer
    // asks for it in a second request.
    await revalidateTagName("update-master-user");

    return { successMessage: message };
  } catch (error) {
    logActionError("user/update-master-user", error);
    return {
      updateMasterUserError: {
        updateMasterUserErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar o usuário Master.",
      },
    };
  }
};

export { handleUpdateMasterUser };
