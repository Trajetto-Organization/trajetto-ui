import {
  handleCreatePresignedUploads,
  type UploadType,
} from "@/actions/upload/create-presigned-uploads";

interface UploadEntry {
  file: File;

  // Which checklist question the photo answers. Carried through untouched so
  // the caller gets its keys back already labelled.
  fieldName?: string;
}

interface UploadedPhoto {
  key: string;
  fieldName?: string;
}

interface UploadToStorageProps {
  entries: UploadEntry[];
  uploadType: UploadType;
  businessId: string;

  // Called after each file lands, so a form can show real progress instead of
  // an indeterminate spinner.
  onProgress?: (uploaded: number, total: number) => void;
}

class UploadError extends Error {}

// Enough to keep a connection busy without opening twenty sockets at once,
// which on a phone connection makes every single upload slower.
const CONCURRENCY = 3;

/**
 * Uploads files straight from the browser to storage and returns their keys.
 *
 * The whole point is that the bytes never touch our servers. The old flow sent
 * every photo through the Next.js Server Action, which buffers the entire body
 * in memory and rejects anything past 1 MB — a checklist with a handful of
 * camera photos blew past that, and the failure surfaced as a spinner that
 * never stopped, with nothing in the network tab and nothing in the API logs.
 *
 * Here the server only signs. Each PUT goes to storage directly, in parallel,
 * and what comes back to the form is a list of keys measured in bytes.
 */
async function uploadToStorage({
  entries,
  uploadType,
  businessId,
  onProgress,
}: UploadToStorageProps): Promise<UploadedPhoto[]> {
  if (entries.length === 0) return [];

  const { uploads, errorMessage } = await handleCreatePresignedUploads({
    uploadType,
    businessId,
    files: entries.map(({ file }) => ({
      originalFilename: file.name,
      contentType: file.type,
      size: file.size,
    })),
  });

  if (errorMessage || !uploads) {
    throw new UploadError(
      errorMessage ?? "Não foi possível autorizar o envio das imagens.",
    );
  }

  if (uploads.length !== entries.length) {
    throw new UploadError("Não foi possível autorizar o envio das imagens.");
  }

  let completed = 0;
  onProgress?.(0, entries.length);

  const uploaded: UploadedPhoto[] = new Array(entries.length);

  // A shared cursor rather than chunking: with mixed file sizes, fixed batches
  // leave workers idle waiting for the one big photo in their group.
  let cursor = 0;

  const worker = async (): Promise<void> => {
    while (cursor < entries.length) {
      const index = cursor++;

      const { file, fieldName } = entries[index];
      const { key, uploadUrl } = uploads[index];

      const response = await fetch(uploadUrl, {
        method: "PUT",

        // The signature covers Content-Type, so this header is not decoration —
        // storage rejects the PUT if it does not match what was signed.
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!response.ok) {
        throw new UploadError(
          `Falha ao enviar a imagem "${file.name}". Verifique sua conexão e tente novamente.`,
        );
      }

      uploaded[index] = { key, fieldName };

      completed += 1;
      onProgress?.(completed, entries.length);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, entries.length) }, worker),
  );

  return uploaded;
}

export { uploadToStorage, UploadError };
export type { UploadEntry, UploadedPhoto };
