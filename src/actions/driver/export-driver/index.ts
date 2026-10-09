"use server";

import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface ExportDriverResponse {
  success?: boolean;
  message?: string;
  base64Data?: string;
  filename?: string;
  totalRecords?: number;
  mimeType?: string;
}

type ExportFormat = "csv" | "excel";

/**
 * What the list on screen is filtered by (decision 5.8), plus the company the
 * MASTER picked. Only these names are forwarded: the API validates each one,
 * and nothing else from the browser rides along.
 */
const EXPORT_FILTER_PARAMS = [
  "businessId",
  "sort",
  "order",
  "status",
  "contract_type",
  "cnh_category",
  "branchId",
] as const;

const handleExportDriver = async (
  search?: string,
  format: ExportFormat = "csv",
  filters: Partial<Record<(typeof EXPORT_FILTER_PARAMS)[number], string>> = {},
): Promise<ExportDriverResponse> => {
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

    for (const name of EXPORT_FILTER_PARAMS) {
      const value = filters[name];

      if (typeof value === "string" && value) params.append(name, value);
    }

    const exportUrl = `${process.env.HTTP_REQUEST}/driver/export-driver?${params.toString()}`;
    const response = await apiFetch(exportUrl, {
      credentials: "include",
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    if (!response.ok) {
      // The API's own sentence ("Não existem motoristas para exportar!"),
      // not the raw JSON body it used to paste into the toast.
      const body = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;

      return {
        success: false,
        message:
          body?.message ??
          `Não foi possível gerar o relatório (erro ${response.status}).`,
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
      : `relatorio-motoristas.${format === "csv" ? "csv" : "xlsx"}`;

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
    logActionError("driver/export-driver", error);
    return {
      success: false,
      message: `Ocorreu um erro inesperado: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
    };
  }
};

export { handleExportDriver };
