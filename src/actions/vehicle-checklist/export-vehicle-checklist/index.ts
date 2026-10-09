"use server";

import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface ExportVehicleChecklistResponse {
  success?: boolean;
  message?: string;
  base64Data?: string;
  filename?: string;
  totalRecords?: number;
  mimeType?: string;
}

type ExportFormat = "csv" | "excel";

interface ExportChecklistScope {
  /** The company on screen; the MASTER must send it (decision 5.8). */
  businessId?: string;
  /** The screen's facet params (overall_condition, branchId, vehicleId). */
  filters?: Record<string, string>;
}

const EXPORT_FILTERS = ["overall_condition", "branchId", "vehicleId"] as const;

/** The checklist table as a file: the screen's company, search and filters. */
const handleExportVehicleChecklist = async (
  search?: string,
  format: ExportFormat = "csv",
  scope: ExportChecklistScope = {},
): Promise<ExportVehicleChecklistResponse> => {
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

    const exportUrl = `${process.env.HTTP_REQUEST}/vehicle-checklist/export-vehicle-checklist?${params.toString()}`;
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
          "Não foi possível gerar o relatório de checklists.",
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
      : `relatorio-checklists.${format === "csv" ? "csv" : "xlsx"}`;

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
    logActionError("vehicle-checklist/export-vehicle-checklist", error);
    return {
      success: false,
      message: `Ocorreu um erro inesperado: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
    };
  }
};

export { handleExportVehicleChecklist };
