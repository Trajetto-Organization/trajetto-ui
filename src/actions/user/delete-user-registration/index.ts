"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";
import { revalidateTagName } from "@/actions/revalidate";

interface DeleteUserProps {
  message: string;
}

const handleDeleteUserRegistration = async (userId: string) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      deleteUserError: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const deleteUser = `${process.env.HTTP_REQUEST}/user/delete-user/${userId}`;

  try {
    const response = await apiFetch(deleteUser, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as DeleteUserProps;

    if (!response.ok) {
      return { deleteUserError: message || refusalMessage(response.status) };
    }

    // Re-renders the screen in this same response: the client no longer
    // asks for it in a second request.
    await revalidateTagName("delete-user-registration");

    return { successMessage: message };
  } catch (error) {
    logActionError("user/delete-user-registration", error);
    return {
      deleteUserError:
        "Ocorreu um erro inesperado ao tentar deletar o usuário.",
    };
  }
};

export { handleDeleteUserRegistration };
