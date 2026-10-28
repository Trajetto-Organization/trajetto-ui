"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";
import { revalidateTagName } from "@/actions/revalidate";

interface DeleteMasterUserProps {
  message: string;
}

const handleDeleteMasterUser = async (masterUserId: string) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      deleteMasterUserError:
        "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const deleteMasterUser = `${process.env.HTTP_REQUEST}/user/delete-master-user/${masterUserId}`;

  try {
    const response = await apiFetch(deleteMasterUser, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as DeleteMasterUserProps;

    if (!response.ok) {
      return {
        deleteMasterUserError: message || refusalMessage(response.status),
      };
    }

    // Re-renders the screen in this same response: the client no longer
    // asks for it in a second request.
    await revalidateTagName("delete-master-user");

    return { successMessage: message };
  } catch (error) {
    logActionError("user/delete-master-user", error);
    return {
      deleteMasterUserError:
        "Ocorreu um erro inesperado ao tentar deletar o usuário Master.",
    };
  }
};

export { handleDeleteMasterUser };
