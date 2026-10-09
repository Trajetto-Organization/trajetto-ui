import { useState } from "react";
import { useSearchParams } from "next/navigation";

import type { ExportButtonProps, ExportFormat } from "../export-button.types";
import { toast } from "sonner";
import { isStaleActionResult } from "@/lib/action-result";
import { localDateKey } from "@/lib/format-values";

import { EXPORT_NEEDS_WRITE } from "../export-rules";

function formatBytes(bytes?: number) {
  if (!bytes || bytes === 0) return "";
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);

  return `${value.toFixed(2)} ${sizes[i]}`;
}

function useExportButton({
  exportAction,
  entityName,
  writePermission,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const searchParams = useSearchParams();

  async function handleExport(format: ExportFormat) {
    // Exporting is a write (decision 4.2). The button is already disabled;
    // this holds when a menu opened before the permission changed.
    if (writePermission === false) {
      toast.error(EXPORT_NEEDS_WRITE);

      return;
    }

    setIsExporting(true);

    try {
      const search = searchParams.get("search") || "";
      const result = await exportAction(search, format);

      if (isStaleActionResult(result)) return;

      if (!result.success || !result.base64Data) {
        toast.error(
          result.message || `Erro ao exportar ${entityName}. Tente novamente.`,
        );

        return;
      }

      // Convert base64 -> Uint8Array
      const byteCharacters = atob(result.base64Data);
      const byteNumbers = new Array(byteCharacters.length);

      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);

      // Use mimeType if provided
      const blob = new Blob([byteArray], {
        type:
          result.mimeType ||
          (format === "csv" ? "text/csv" : "application/octet-stream"),
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.style.display = "none";
      a.href = url;

      // The server's name (the API dates it with the company's day), or a
      // fallback dated by the viewer's calendar: the UTC day read tomorrow
      // after 21:00 in São Paulo.
      a.download =
        result.filename ||
        `${entityName}-${localDateKey()}.${format === "csv" ? "csv" : "xlsx"}`;

      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // compute size, prefer server-provided fileSize
      const sizeInBytes = result.fileSize ?? byteArray.length;
      const sizeLabel = formatBytes(sizeInBytes);

      // Assemble the final message including filename and size
      const filenameLabel = result.filename ? ` "${result.filename}"` : "";
      const sizeSuffix = sizeLabel ? ` (${sizeLabel})` : "";

      toast.success(
        result.message && result.message.length > 0
          ? `${result.message}${sizeSuffix}`
          : `${entityName}${filenameLabel} exportado com sucesso!${sizeSuffix}`,
      );
    } catch (error) {
      toast.error(`Erro ao exportar ${entityName}. Tente novamente.`);
    } finally {
      setIsExporting(false);
    }
  }

  return {
    handleExport,
    isExporting,
  };
}

export { useExportButton };
