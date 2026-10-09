"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { revalidateTagName } from "../../revalidate";
import { apiFetch } from "@/lib/api-fetch";

interface DeleteAvatarResponse {
  message: string;
}

const handleDeleteAvatar = async (state: any, formData?: FormData) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      avatarError: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const deleteAvatarUrl = `${process.env.HTTP_REQUEST}/user/avatar`;

  try {
    const response = await apiFetch(deleteAvatarUrl, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as DeleteAvatarResponse;

    if (!response.ok) {
      return { avatarError: message || refusalMessage(response.status) };
    }

    await revalidateTagName("update-username");
    return { successMessage: message };
  } catch (error) {
    logActionError("user/delete-avatar", error);
    return {
      avatarError:
        "Ocorreu um erro inesperado ao tentar deletar o avatar! Por favor, tente novamente.",
    };
  }
};

export { handleDeleteAvatar };
