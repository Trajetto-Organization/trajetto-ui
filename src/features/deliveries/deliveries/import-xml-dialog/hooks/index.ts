import { useCallback, useState } from "react";

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
  const hasXmlType =
    file.type === "text/xml" || file.type === "application/xml";

  return hasXmlExtension || hasXmlType;
}

function useImportXmlFiles() {
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [isReading, setIsReading] = useState<boolean>(false);

  // What the last pick left out, said under the drop zone (decision
  // 16.700) rather than in a toast that is gone before it is read.
  const [rejection, setRejection] = useState<string | null>(null);

  const addFiles = useCallback(async (fileList: FileList | File[] | null) => {
    if (!fileList) return;

    const picked = Array.from(fileList);
    if (picked.length === 0) return;

    setRejection(xmlRejection(picked));

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
          setRejection(
            `Selecione no máximo ${MAX_FILES} arquivos por importação: os excedentes ficaram de fora.`,
          );

          return merged.slice(0, MAX_FILES);
        }

        return merged;
      });
    } finally {
      setIsReading(false);
    }
  }, []);

  const removeFile = useCallback((filename: string) => {
    setFiles((previous) =>
      previous.filter((file) => file.filename !== filename),
    );
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
    setRejection(null);
  }, []);

  // The drag state and its enter/leave counter live in `FileDropzone` now:
  // this hook reads and validates files, the zone decides when it has some.
  return { files, isReading, rejection, addFiles, removeFile, clearFiles };
}

/** What a pick leaves out (not XML, too big), in one sentence, or null. */
function xmlRejection(
  picked: Array<Pick<File, "name" | "size" | "type">>,
): string | null {
  const notXml = picked.filter((file) => !isXmlFile(file as File));
  const oversized = picked.filter(
    (file) => isXmlFile(file as File) && file.size > MAX_FILE_SIZE,
  );

  const parts: string[] = [];

  if (notXml.length === 1)
    parts.push(`"${notXml[0].name}" não é um arquivo XML.`);
  if (notXml.length > 1)
    parts.push(`${notXml.length} arquivos foram ignorados por não serem XML.`);
  if (oversized.length > 0) {
    parts.push(
      `"${oversized[0].name}" é grande demais para uma NF-e (limite de 512 KB).`,
    );
  }

  return parts.length > 0 ? parts.join(" ") : null;
}

export { useImportXmlFiles, xmlRejection, MAX_FILES, MAX_FILE_SIZE };
export type { PickedFile };
