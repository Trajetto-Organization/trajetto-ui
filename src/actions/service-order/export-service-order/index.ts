"use server";

// Deprecated: the screen downloads this export through the relay, streamed
// (src/lib/export-download.ts, src/lib/export-requests.ts). Kept for one
// release only for the tabs opened before the deploy, which still call this
// action (expand, then contract); remove it in the next release.

import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface ExportServiceOrderResponse {
  success?: boolean;
  message?: string;
  base64Data?: string;
  filename?: string;
  totalRecords?: number;
  mimeType?: string;
}

type ExportFormat = "csv" | "excel";

interface ExportServiceOrderOptions {
  /** The company the master picked at the top of /admin. */
  businessId?: string;
  /** The listing's sort/filter params, so the file holds what the table shows (5.8). */
  filters?: Record<string, string>;
}

/** Only the listing's own filters go through; the rest of the URL stays home. */
const EXPORT_FILTERS = ["status", "maintenanceType", "branchId"] as const;

const handleExportServiceOrder = async (
  search?: string,
  format: ExportFormat = "csv",
  options: ExportServiceOrderOptions = {},
): Promise<ExportServiceOrderResponse> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      success: false,
      message: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  try {
    const params = new URLSearchParams();

    if (search) params.append("search", search);
    if (format) params.append("format", format);
    if (options.businessId) params.append("businessId", options.businessId);

    for (const key of EXPORT_FILTERS) {
      const value = options.filters?.[key];

      if (value) params.append(key, value);
    }

    const exportUrl = `${process.env.HTTP_REQUEST}/service-order/export-service-order?${params.toString()}`;
    const response = await apiFetch(exportUrl, {
      credentials: "include",
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    if (!response.ok) {
      // The API's own sentence ("Não existem ordens de serviço para
      // exportar!"), not the raw body with a status number in front.
      const body = await response.json().catch(() => null);

      return {
        success: false,
        message:
          typeof body?.message === "string"
            ? body.message
            : `Erro ao gerar relatório (${response.status}).`,
      };
    }

    const contentDisposition = response.headers.get("content-disposition");
    const mimeType = response.headers.get("content-type") || "";

    const totalRecords = response.headers.get("X-Total-Records");
    // The API names the file with the company's day (decision 1.2); the
    // fallback carries no date rather than the server's UTC one, which is
    // tomorrow after 21:00 in São Paulo.
    const filename = contentDisposition
      ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
      : `relatorio-ordens-de-servico.${format === "csv" ? "csv" : "xlsx"}`;

    const arrayBuffer = await response.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    return {
      success: true,
      base64Data,
      filename,
      totalRecords: totalRecords ? parseInt(totalRecords) : 0,
      mimeType,
      message: `Relatório gerado com sucesso!`,
    };
  } catch (error) {
    logActionError("service-order/export-service-order", error);
    return {
      success: false,
      message: `Ocorreu um erro inesperado: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
    };
  }
};

export { handleExportServiceOrder };
