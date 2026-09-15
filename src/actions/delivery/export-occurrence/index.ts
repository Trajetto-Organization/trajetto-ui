"use server";

import { getCookies } from "../../cookies";

import type { ExportFormat, ExportResponse } from "../export-delivery";

/**
 * The report a carrier sends the shipper who asks why the cargo did not go in.
 *
 * One line per occurrence, with the type, whether it blocks the delivery, the
 * recipient and who reported it.
 */
const handleExportOccurrence = async (
  search?: string,
  format: ExportFormat = "csv",
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

    const response = await fetch(
      `${process.env.HTTP_REQUEST}/delivery/export-occurrence?${params.toString()}`,
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
      `ocorrencias-${new Date().toISOString().split("T")[0]}.${
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
      message: "Ocorreu um erro inesperado ao exportar as ocorrências.",
    };
  }
};

export { handleExportOccurrence };
