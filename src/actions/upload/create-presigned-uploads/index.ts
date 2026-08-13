"use server";

import { getCookies } from "../../cookies";

type UploadType = "checklistPhotos" | "odometerPhotos" | "avatars";

interface PresignedUploadFile {
  originalFilename: string;
  contentType: string;
  size: number;
}

interface CreatePresignedUploadsProps {
  uploadType: UploadType;
  businessId: string;
  files: PresignedUploadFile[];
}

interface PresignedUpload {
  key: string;
  uploadUrl: string;
  expiresIn: number;
}

interface CreatePresignedUploadsResult {
  uploads?: PresignedUpload[];
  errorMessage?: string;
}

/**
 * Asks the API to authorise a direct upload and hands the signed URLs back to
 * the browser.
 *
 * This runs on the server only because the access token lives in an httpOnly
 * cookie the browser cannot read — not because the files pass through here.
 * They do not: only name, type and size travel, a few hundred bytes, so this
 * never comes near the Server Action body limit that the old multipart flow
 * kept hitting. The bytes go straight from the browser to storage.
 */
const handleCreatePresignedUploads = async ({
  uploadType,
  businessId,
  files,
}: CreatePresignedUploadsProps): Promise<CreatePresignedUploadsResult> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      errorMessage: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  if (files.length === 0) {
    return { uploads: [] };
  }

  const presignUrl = `${process.env.HTTP_REQUEST}/uploads/presign/${businessId}`;

  try {
    const response = await fetch(presignUrl, {
      method: "POST",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uploadType, files }),
    });

    const data = (await response.json()) as {
      uploads?: PresignedUpload[];
      message?: string;
    };

    if (!response.ok) {
      return {
        errorMessage:
          data.message ?? "Não foi possível autorizar o envio das imagens.",
      };
    }

    return { uploads: data.uploads ?? [] };
  } catch {
    return {
      errorMessage: "Não foi possível autorizar o envio das imagens.",
    };
  }
};

export { handleCreatePresignedUploads };
export type { PresignedUpload, PresignedUploadFile, UploadType };
