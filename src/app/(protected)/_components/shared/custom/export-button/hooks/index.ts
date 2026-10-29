import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import type { ExportButtonProps, ExportFormat } from "../export-button.types";
import { toast } from "sonner";

import { downloadExport } from "@/lib/export-download";

import { EXPORT_NEEDS_WRITE } from "../export-rules";

function formatBytes(bytes?: number) {
  if (!bytes || bytes === 0) return "";
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);

  return `${value.toFixed(2)} ${sizes[i]}`;
}

/**
 * The Exportar button's click: the file comes straight from the API through
 * the same-origin relay (src/lib/export-download.ts), streamed — no Server
 * Action holds it, base64-encoded, in the server's memory any more.
 */
function useExportButton({
  exportRequest,
  entityName,
  writePermission,
}: Pick<
  ExportButtonProps,
  "exportRequest" | "entityName" | "writePermission"
>) {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const searchParams = useSearchParams();

  // Leaving the page drops the download, and with it the API's work.
  const inFlight = useRef<AbortController | null>(null);

  useEffect(() => () => inFlight.current?.abort(), []);

  async function handleExport(format: ExportFormat) {
    // Exporting is a write (decision 4.2). The button is already disabled;
    // this holds when a menu opened before the permission changed.
    if (writePermission === false) {
      toast.error(EXPORT_NEEDS_WRITE);

      return;
    }

    setIsExporting(true);

    const controller = new AbortController();
    inFlight.current = controller;

    try {
      const search = searchParams.get("search") || "";
      const result = await downloadExport(exportRequest(search, format), {
        signal: controller.signal,
      });

      if (!result.ok) {
        if (!result.aborted) {
          toast.error(
            result.message ||
              `Erro ao exportar ${entityName}. Tente novamente.`,
          );
        }

        return;
      }

      const sizeLabel = formatBytes(result.size);

      // The final message names the file and its size.
      const filenameLabel = result.filename ? ` "${result.filename}"` : "";
      const sizeSuffix = sizeLabel ? ` (${sizeLabel})` : "";

      toast.success(
        `${entityName}${filenameLabel} exportado com sucesso!${sizeSuffix}`,
      );
    } catch {
      toast.error(`Erro ao exportar ${entityName}. Tente novamente.`);
    } finally {
      if (inFlight.current === controller) inFlight.current = null;

      setIsExporting(false);
    }
  }

  return {
    handleExport,
    isExporting,
  };
}

export { useExportButton };
