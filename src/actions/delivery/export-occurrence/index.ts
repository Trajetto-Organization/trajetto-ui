"use server";

// Deprecated: the screen downloads this export through the relay, streamed
// (src/lib/export-download.ts, src/lib/export-requests.ts). Kept for one
// release only for the tabs opened before the deploy, which still call this
// action (expand, then contract); remove it in the next release.

import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";

import type { ExportFormat, ExportResponse } from "../export-delivery";

import {
  OCCURRENCE_EXPORT_FILTERS,
  buildExportParams,
  exportErrorMessage,
  type ExportFilters,
} from "@/features/deliveries/lib/export-query";
import { apiFetch } from "@/lib/api-fetch";

/**
 * The report a carrier sends the shipper who asks why the cargo did not go in.
 *
 * One line per occurrence, with the type, whether it blocks the delivery, the
 * recipient and who reported it.
 */
const handleExportOccurrence = async (
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
    // The feed's facets and, for the MASTER, the company (DLV-EXP-1).
    const params = buildExportParams(
      search,
      format,
      filters,
      OCCURRENCE_EXPORT_FILTERS,
    );

    const response = await apiFetch(
      `${process.env.HTTP_REQUEST}/delivery/export-occurrence?${params.toString()}`,
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
      `ocorrencias.${format === "csv" ? "csv" : "xlsx"}`;

    const arrayBuffer = await response.arrayBuffer();

    return {
      success: true,
      base64Data: Buffer.from(arrayBuffer).toString("base64"),
      filename,
      mimeType: response.headers.get("content-type") || "",
    };
  } catch (error) {
    logActionError("delivery/export-occurrence", error);
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao exportar as ocorrências.",
    };
  }
};

export { handleExportOccurrence };
