import { useCallback, useState } from "react";

import {
  uploadToStorage,
  UploadError,
  type UploadedPhoto,
} from "@/lib/upload-to-storage";
import type { UploadType } from "@/actions/upload/create-presigned-uploads";

interface UploadProgressState {
  uploaded: number;
  total: number;
}

interface UploadPhotosProps {
  files: Record<string, File[]>;
  uploadType: UploadType;
  businessId: string;

  // Ceiling for the batch as a whole. Checked here purely so the user hears
  // about it before uploading megabytes that are going to be refused — the API
  // enforces the same limit against the real byte counts in storage, and that
  // is the one that decides.
  maxTotalBytes?: number;
}

interface UsePhotoUpload {
  uploadProgress: UploadProgressState | null;
  uploadError: string | null;
  resetUpload: () => void;

  // Resolves to the uploaded keys, or to null when the upload failed — the
  // caller stops there and the error is already on screen.
  uploadPhotos: (props: UploadPhotosProps) => Promise<UploadedPhoto[] | null>;
}

/**
 * Progress and error state for a direct-to-storage upload.
 *
 * Four checklist forms (admin and dashboard, create and update) run exactly
 * the same sequence — rename, upload, collect the keys — so it lives here
 * instead of being copied into each of them.
 */
function usePhotoUpload(): UsePhotoUpload {
  const [uploadProgress, setUploadProgress] =
    useState<UploadProgressState | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const resetUpload = useCallback(() => {
    setUploadProgress(null);
    setUploadError(null);
  }, []);

  const uploadPhotos = useCallback(
    async ({
      files,
      uploadType,
      businessId,
      maxTotalBytes,
    }: UploadPhotosProps): Promise<UploadedPhoto[] | null> => {
      // Kept from the multipart days so both clients produce recognisably
      // similar names: fieldName_timestamp_index.extension.
      const entries = Object.entries(files).flatMap(([fieldName, fieldFiles]) =>
        fieldFiles.map((file, index) => {
          const extension = file.name.split(".").pop() || "jpg";
          const name = `${fieldName}_${Date.now()}_${index}.${extension}`;

          return {
            fieldName,
            file: new File([file], name, { type: file.type }),
          };
        }),
      );

      setUploadError(null);
      setUploadProgress(null);

      if (maxTotalBytes !== undefined) {
        const totalBytes = entries.reduce(
          (total, { file }) => total + file.size,
          0,
        );

        if (totalBytes > maxTotalBytes) {
          setUploadError(
            `O tamanho total das fotos deve ser de no máximo ${Math.round(
              maxTotalBytes / 1024 / 1024,
            )} MB.`,
          );

          return null;
        }
      }

      try {
        const photos = await uploadToStorage({
          entries,
          uploadType,
          businessId,
          onProgress: (uploaded, total) =>
            setUploadProgress({ uploaded, total }),
        });

        setUploadProgress(null);
        return photos;
      } catch (error) {
        setUploadProgress(null);
        setUploadError(
          error instanceof UploadError
            ? error.message
            : "Não foi possível enviar as fotos. Tente novamente.",
        );

        return null;
      }
    },
    [],
  );

  return { uploadProgress, uploadError, resetUpload, uploadPhotos };
}

export { usePhotoUpload };
export type { UploadProgressState, UsePhotoUpload };
