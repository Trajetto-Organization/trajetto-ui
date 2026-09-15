"use server";

import { getCookies } from "../../cookies";

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
 * Built to the shared ExportButton's `(search, format)` contract; the status
 * filter is bound by the caller, so the button exports exactly what the table
 * in front of the operator is showing. An export that ignored the filter is
 * one people stop trusting after the first time it surprises them.
 */
const handleExportDelivery = async (
  search?: string,
  format: ExportFormat = "csv",
  status?: string,
): Promise<ExportResponse> => {
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
    if (status) params.append("status", status);

    const response = await fetch(
      `${process.env.HTTP_REQUEST}/delivery/export-delivery?${params.toString()}`,
      {
        credentials: "include",
        method: "GET",
        headers: { Authorization: `Bearer ${tokenAccess}` },
      },
    );

    if (!response.ok) {
      const errorData = await response.text();

      return {
        success: false,
        message: `Erro ao gerar relatório: ${response.status} - ${errorData}`,
      };
    }

    const contentDisposition = response.headers.get("content-disposition");

    const filename =
      contentDisposition?.split("filename=")[1]?.replace(/"/g, "") ??
      `entregas-${new Date().toISOString().split("T")[0]}.${
        format === "csv" ? "csv" : "xlsx"
      }`;

    const arrayBuffer = await response.arrayBuffer();

    return {
      success: true,
      base64Data: Buffer.from(arrayBuffer).toString("base64"),
      filename,
      mimeType: response.headers.get("content-type") || "",
    };
  } catch (error) {
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao exportar as entregas.",
    };
  }
};

export { handleExportDelivery };
export type { ExportFormat, ExportResponse };
