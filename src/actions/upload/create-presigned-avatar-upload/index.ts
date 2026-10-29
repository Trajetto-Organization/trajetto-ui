"use server";

import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import type {
  PresignedUpload,
  PresignedUploadFile,
} from "../create-presigned-uploads";
import { apiFetch } from "@/lib/api-fetch";

interface CreatePresignedAvatarUploadProps {
  file: PresignedUploadFile;
}

interface CreatePresignedAvatarUploadResult {
  upload?: PresignedUpload;
  errorMessage?: string;
}

/**
 * Authorises a direct avatar upload.
 *
 * Its own endpoint rather than the business one: an avatar belongs to a person,
 * not to a company, and a MASTER user may have no business at all — there is no
 * tenant id to put in the URL.
 */
const handleCreatePresignedAvatarUpload = async ({
  file,
}: CreatePresignedAvatarUploadProps): Promise<CreatePresignedAvatarUploadResult> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      errorMessage: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const presignUrl = `${process.env.HTTP_REQUEST}/uploads/avatar/presign`;

  try {
    const response = await apiFetch(presignUrl, {
      method: "POST",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ files: [file] }),
    });

    const data = (await response.json()) as {
      uploads?: PresignedUpload[];
      message?: string;
    };

    if (!response.ok || !data.uploads?.[0]) {
      return {
        errorMessage:
          data.message ?? "Não foi possível autorizar o envio da imagem.",
      };
    }

    return { upload: data.uploads[0] };
  } catch (error) {
    logActionError("upload/create-presigned-avatar-upload", error);
    return { errorMessage: "Não foi possível autorizar o envio da imagem." };
  }
};

export { handleCreatePresignedAvatarUpload };
