"use server";

// Deprecated: the screen downloads this export through the relay, streamed
// (src/lib/export-download.ts, src/lib/export-requests.ts). Kept for one
// release only for the tabs opened before the deploy, which still call this
// action (expand, then contract); remove it in the next release.

import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";

import {
  DELIVERY_EXPORT_FILTERS,
  buildExportParams,
  exportErrorMessage,
  type ExportFilters,
} from "@/features/deliveries/lib/export-query";
import { apiFetch } from "@/lib/api-fetch";

interface ExportResponse {
  success?: boolean;
  message?: string;
  base64Data?: string;
  filename?: string;
  mimeType?: string;
}

type ExportFormat = "csv" | "excel";

/**
 * The operation as a file.
 *
 * Built to the shared ExportButton's `(search, format)` contract; the page
 * binds the rest — the table's facets and, on /admin, the company chosen in
 * the selector (decision 5.8, DLV-EXP-1). An export that ignored the filter is
 * one people stop trusting after the first time it surprises them.
 */
const handleExportDelivery = async (
  search?: string,
  format: ExportFormat = "csv",
  filters: ExportFilters = {},
): Promise<ExportResponse> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      success: false,
      message: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  try {
    const params = buildExportParams(
      search,
      format,
      filters,
      DELIVERY_EXPORT_FILTERS,
    );

    const response = await apiFetch(
      `${process.env.HTTP_REQUEST}/delivery/export-delivery?${params.toString()}`,
      {
        credentials: "include",
        method: "GET",
        headers: { Authorization: `Bearer ${tokenAccess}` },
      },
    );

    if (!response.ok) {
      return {
        success: false,
        message: exportErrorMessage(response.status, await response.text()),
      };
    }

    const contentDisposition = response.headers.get("content-disposition");

    // The API names the file with the company's day (decision 1.2); the
    // fallback carries no date rather than the server's UTC one, which is
    // tomorrow after 21:00 in São Paulo.
    const filename =
      contentDisposition?.split("filename=")[1]?.replace(/"/g, "") ??
      `entregas.${format === "csv" ? "csv" : "xlsx"}`;

    const arrayBuffer = await response.arrayBuffer();

    return {
      success: true,
      base64Data: Buffer.from(arrayBuffer).toString("base64"),
      filename,
      mimeType: response.headers.get("content-type") || "",
    };
  } catch (error) {
    logActionError("delivery/export-delivery", error);
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao exportar as entregas.",
    };
  }
};

export { handleExportDelivery };
export type { ExportFormat, ExportResponse };
