"use server";

import { getCookies } from "../../cookies";
import { revalidateTagName } from "../../revalidate";

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
    const response = await fetch(deleteAvatarUrl, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as DeleteAvatarResponse;

    if (!response.ok && message) {
      return { avatarError: message };
    }

    await revalidateTagName("update-username");
    return { successMessage: message };
  } catch (error) {
    return {
      avatarError:
        "Ocorreu um erro inesperado ao tentar deletar o avatar! Por favor, tente novamente.",
    };
  }
};

export { handleDeleteAvatar };
