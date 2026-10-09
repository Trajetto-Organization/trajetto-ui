"use server";

import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface ExportVehicleResponse {
  success?: boolean;
  message?: string;
  base64Data?: string;
  filename?: string;
  totalRecords?: number;
  mimeType?: string;
}

type ExportFormat = "csv" | "excel";

interface ExportVehicleScope {
  /** The company on screen; the MASTER must send it (decision 5.8). */
  businessId?: string;
  /** The screen's facet params (`status`, `branchId`), as in the URL. */
  filters?: Record<string, string>;
}

const EXPORT_FILTERS = ["status", "branchId"] as const;

/**
 * The vehicle table as a file, with the screen's search AND filters, for the
 * company on screen. It used to send only the search: a filtered screen
 * exported the whole fleet, and the MASTER exported every company.
 */
const handleExportVehicle = async (
  search?: string,
  format: ExportFormat = "csv",
  scope: ExportVehicleScope = {},
): Promise<ExportVehicleResponse> => {
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
    if (scope.businessId) params.append("businessId", scope.businessId);

    for (const key of EXPORT_FILTERS) {
      const value = scope.filters?.[key];
      if (value) params.append(key, value);
    }

    const exportUrl = `${process.env.HTTP_REQUEST}/vehicle/export-vehicle?${params.toString()}`;
    const response = await apiFetch(exportUrl, {
      credentials: "include",
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);

      return {
        success: false,
        message:
          (body && typeof body.message === "string" && body.message) ||
          "Não foi possível gerar o relatório de veículos.",
      };
    }

    const contentDisposition = response.headers.get("content-disposition");
    const mimeType = response.headers.get("content-type") || "";

    const totalRecords = response.headers.get("X-Total-Records");
    const filename = contentDisposition
      ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
      : `relatorio-veiculos.${format === "csv" ? "csv" : "xlsx"}`;

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
    logActionError("vehicle/export-vehicle", error);
    return {
      success: false,
      message: `Ocorreu um erro inesperado: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
    };
  }
};

export { handleExportVehicle };
