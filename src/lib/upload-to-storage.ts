import {
  handleCreatePresignedUploads,
  type UploadType,
} from "@/actions/upload/create-presigned-uploads";
import { handleReportClientDiagnostics } from "@/actions/diagnostics/report-client-diagnostics";
import { STALE_ACTION_MESSAGE, isStaleActionResult } from "@/lib/action-result";

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

/** The storage host of a signed URL; the path and the signature stay here. */
function hostOf(url: string): string | undefined {
  try {
    return new URL(url).host;
  } catch {
    return undefined;
  }
}

/**
 * Tells the API a PUT failed (OBS-12). Fire-and-forget: the report never
 * delays or replaces the error the form shows.
 */
function reportUploadFailure(
  kind: "upload" | "network",
  uploadUrl: string,
  status?: number,
): void {
  try {
    void handleReportClientDiagnostics({
      errors: [
        {
          kind,
          status,
          host: hostOf(uploadUrl),
          message:
            kind === "upload"
              ? `PUT ao storage recusado (HTTP ${status})`
              : "PUT ao storage sem resposta (rede ou CORS)",
          count: 1,
        },
      ],
    }).catch(() => undefined);
  } catch {
    // Reporting must never be what breaks an upload.
  }
}

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

  const presigned = await handleCreatePresignedUploads({
    uploadType,
    businessId,
    files: entries.map(({ file }) => ({
      originalFilename: file.name,
      contentType: file.type,
      size: file.size,
    })),
  });

  // The form shows an UploadError's message as is; this one says to reload.
  if (isStaleActionResult(presigned)) {
    throw new UploadError(STALE_ACTION_MESSAGE);
  }

  const { uploads, errorMessage } = presigned;

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

  // One report per upload: the workers that fail alongside the first one hit
  // the same bucket for the same reason, and each report spends the user's
  // hourly diagnostics budget at the API.
  let reported = false;
  const reportOnce = (
    ...args: Parameters<typeof reportUploadFailure>
  ): void => {
    if (reported) return;

    reported = true;
    reportUploadFailure(...args);
  };

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
      }).catch((error: unknown) => {
        // No answer at all: a dropped connection, or a CORS refusal, which
        // fetch reports the same way.
        reportOnce("network", uploadUrl);
        throw error;
      });

      if (!response.ok) {
        reportOnce("upload", uploadUrl, response.status);

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
