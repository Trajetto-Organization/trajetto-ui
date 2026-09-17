import { useCallback, useState } from "react";
import { toast } from "sonner";

/**
 * Mirrors the API cap so the operator hears "no" before spending two minutes
 * uploading. 6 MB of spreadsheet is tens of thousands of rows — far past what
 * one dispatcher loads in a morning.
 */
const MAX_FILE_SIZE = 6 * 1024 * 1024;

interface PickedSpreadsheet {
  filename: string;

  /** base64, which is what the endpoint takes. */
  content: string;

  size: number;
}

function isSpreadsheet(file: File): boolean {
  // Browsers disagree about the MIME type of .csv (text/csv, application/
  // vnd.ms-excel, and sometimes nothing at all), so the extension is the
  // reliable signal and the type is only a hint.
  return /\.(xlsx|csv)$/i.test(file.name);
}

/** The bytes as the endpoint wants them, without pulling the whole file twice. */
async function toBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Chunked: String.fromCharCode(...bytes) on a multi-megabyte file blows the
  // argument limit and throws, which reads to the user like a corrupt file.
  const CHUNK = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(index, index + CHUNK));
  }

  return btoa(binary);
}

/**
 * One file, not many.
 *
 * An upload is one shipper's load, and a second file is a second upload with
 * its own report and its own undo. Letting two in would make "estornar" mean
 * something the operator cannot predict.
 */
function useImportSpreadsheet() {
  const [file, setFile] = useState<PickedSpreadsheet | null>(null);
  const [isReading, setIsReading] = useState<boolean>(false);

  const pickFile = useCallback(async (fileList: FileList | File[] | null) => {
    if (!fileList) return;

    const [picked] = Array.from(fileList);

    if (!picked) return;

    if (!isSpreadsheet(picked)) {
      toast.error(`"${picked.name}" não é uma planilha .xlsx ou .csv.`);
      return;
    }

    if (picked.size > MAX_FILE_SIZE) {
      toast.error(
        `"${picked.name}" é grande demais (limite de ${Math.round(
          MAX_FILE_SIZE / (1024 * 1024),
        )} MB).`,
      );

      return;
    }

    setIsReading(true);

    try {
      setFile({
        filename: picked.name,
        content: await toBase64(picked),
        size: picked.size,
      });
    } catch (error) {
      toast.error("Não foi possível ler o arquivo. Tente novamente.");
    } finally {
      setIsReading(false);
    }
  }, []);

  const clearFile = useCallback(() => {
    setFile(null);
  }, []);

  // The drag state and its enter/leave counter live in `FileDropzone` now:
  // this hook reads and validates the file, the zone decides when it has one.
  return { file, isReading, pickFile, clearFile };
}

export { useImportSpreadsheet, MAX_FILE_SIZE };
export type { PickedSpreadsheet };
