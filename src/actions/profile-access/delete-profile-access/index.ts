"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface DeleteProfileAccessProps {
  message: string;
}

const handleDeleteProfileAccess = async (profileAccessId: string) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      deleteProfileAccessError:
        "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const deleteProfileAccess = `${process.env.HTTP_REQUEST}/profile-access/delete-profile-access/${profileAccessId}`;

  try {
    const response = await apiFetch(deleteProfileAccess, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as DeleteProfileAccessProps;

    if (!response.ok) {
      return {
        deleteProfileAccessError: message || refusalMessage(response.status),
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("profile-access/delete-profile-access", error);
    return {
      deleteProfileAccessError:
        "Ocorreu um erro inesperado ao tentar deletar o perfil de acesso.",
    };
  }
};

export { handleDeleteProfileAccess };
