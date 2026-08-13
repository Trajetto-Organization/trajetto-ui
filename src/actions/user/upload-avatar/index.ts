"use server";

import { getCookies } from "../../cookies";
import { revalidateTagName } from "../../revalidate";

interface UploadAvatarResponse {
  message: string;
}

/**
 * Records an avatar that is already in storage.
 *
 * The image itself never passes through here: the browser uploads it straight
 * to the bucket and this action only forwards the resulting key. See
 * `uploadToStorage` for the flow.
 */
const handleUploadAvatar = async (state: any, formData: FormData) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      avatarError: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const uploadAvatarUrl = `${process.env.HTTP_REQUEST}/user/avatar`;
  const photoKey = formData.get("photoKey");

  // Type and size were enforced in the browser and are enforced again by
  // storage, which refuses a PUT that does not match the signature. What is
  // still worth checking here is presence.
  if (typeof photoKey !== "string" || photoKey.length === 0) {
    return {
      avatarError: "Por favor, selecione uma imagem para fazer o upload.",
    };
  }

  try {
    const response = await fetch(uploadAvatarUrl, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ photo: { key: photoKey } }),
    });

    const { message } = (await response.json()) as UploadAvatarResponse;

    if (!response.ok && message) {
      return { avatarError: message };
    }

    await revalidateTagName("update-username");
    return { successMessage: message };
  } catch (error) {
    return {
      avatarError:
        "Ocorreu um erro inesperado ao tentar fazer upload do avatar! Por favor, tente novamente.",
    };
  }
};

export { handleUploadAvatar };
