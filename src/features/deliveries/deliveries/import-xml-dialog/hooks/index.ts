import { useCallback, useState } from "react";
import { toast } from "sonner";

/** Mirrors the API cap so the user hears "no" before uploading. */
const MAX_FILES = 25;
const MAX_FILE_SIZE = 512 * 1024;

interface PickedFile {
  filename: string;
  content: string;
  size: number;
}

function isXmlFile(file: File): boolean {
  // Browsers are inconsistent about the MIME type of .xml, so the extension
  // is the reliable signal and the type is only a hint.
  const hasXmlExtension = file.name.toLowerCase().endsWith(".xml");
  const hasXmlType = file.type === "text/xml" || file.type === "application/xml";

  return hasXmlExtension || hasXmlType;
}

function useImportXmlFiles() {
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [isReading, setIsReading] = useState<boolean>(false);

  const addFiles = useCallback(
    async (fileList: FileList | File[] | null) => {
      if (!fileList) return;

      const picked = Array.from(fileList);
      if (picked.length === 0) return;

      const rejected = picked.filter((file) => !isXmlFile(file));

      if (rejected.length > 0) {
        toast.error(
          rejected.length === 1
            ? `"${rejected[0].name}" não é um arquivo XML.`
            : `${rejected.length} arquivos foram ignorados por não serem XML.`,
        );
      }

      const oversized = picked.filter(
        (file) => isXmlFile(file) && file.size > MAX_FILE_SIZE,
      );

      if (oversized.length > 0) {
        toast.error(
          `"${oversized[0].name}" é grande demais para uma NF-e (limite de 512 KB).`,
        );
      }

      const accepted = picked.filter(
        (file) => isXmlFile(file) && file.size <= MAX_FILE_SIZE,
      );

      if (accepted.length === 0) return;

      setIsReading(true);

      try {
        const contents = await Promise.all(
          accepted.map(async (file) => ({
            filename: file.name,
            content: await file.text(),
            size: file.size,
          })),
        );

        setFiles((previous) => {
          // Dropping the same file twice is a slip, not an intent.
          const merged = [...previous];

          for (const file of contents) {
            if (!merged.some((item) => item.filename === file.filename)) {
              merged.push(file);
            }
          }

          if (merged.length > MAX_FILES) {
            toast.error(
              `Selecione no máximo ${MAX_FILES} arquivos por importação.`,
            );

            return merged.slice(0, MAX_FILES);
          }

          return merged;
        });
      } finally {
        setIsReading(false);
      }
    },
    [],
  );

  const removeFile = useCallback((filename: string) => {
    setFiles((previous) =>
      previous.filter((file) => file.filename !== filename),
    );
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
  }, []);

  // The drag state and its enter/leave counter live in `FileDropzone` now:
  // this hook reads and validates files, the zone decides when it has some.
  return { files, isReading, addFiles, removeFile, clearFiles };
}

export { useImportXmlFiles, MAX_FILES, MAX_FILE_SIZE };
export type { PickedFile };
