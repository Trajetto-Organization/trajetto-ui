"use server";

import { getCookies } from "../../cookies";
import { revalidateTagName } from "../../revalidate";

interface UploadAvatarResponse {
  message: string;
}

const handleUploadAvatar = async (state: any, formData: FormData) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      avatarError: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const uploadAvatarUrl = `${process.env.HTTP_REQUEST}/user/avatar`;
  const avatarFile = formData.get("avatar") as File | Blob;

  if (!avatarFile) {
    return {
      avatarError: "Por favor, selecione uma imagem para fazer o upload.",
    };
  }

  // Validate file size (5MB max)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (avatarFile.size > maxSize) {
    return {
      avatarError: "A imagem deve ter no máximo 5MB.",
    };
  }

  // Validate file type (only for File objects, Blobs from crop are already validated as webp)
  if (avatarFile instanceof File) {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(avatarFile.type)) {
      return {
        avatarError: "Formato de arquivo não suportado. Use JPEG, PNG ou WebP.",
      };
    }
  }

  try {
    const uploadFormData = new FormData();
    uploadFormData.append("file", avatarFile);

    const response = await fetch(uploadAvatarUrl, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
      body: uploadFormData,
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
