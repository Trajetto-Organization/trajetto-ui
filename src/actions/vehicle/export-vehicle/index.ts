"use server";

import { getCookies } from "../../cookies";

interface ExportVehicleResponse {
  success?: boolean;
  message?: string;
  base64Data?: string;
  filename?: string;
  totalRecords?: number;
  mimeType?: string;
}

type ExportFormat = "csv" | "excel";

const handleExportVehicle = async (
  search?: string,
  format: ExportFormat = "csv",
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

    const exportUrl = `${process.env.HTTP_REQUEST}/vehicle/export-vehicle?${params.toString()}`;
    const response = await fetch(exportUrl, {
      credentials: "include",
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      return {
        success: false,
        message: `Erro ao gerar relatório: ${response.status} - ${errorData}`,
      };
    }

    const contentDisposition = response.headers.get("content-disposition");
    const mimeType = response.headers.get("content-type") || "";

    const totalRecords = response.headers.get("X-Total-Records");
    const filename = contentDisposition
      ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
      : `relatorio-${new Date().toISOString().split("T")[0]}.${
          format === "csv" ? "csv" : "xlsx"
        }`;

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
    return {
      success: false,
      message: `Ocorreu um erro inesperado: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
    };
  }
};

export { handleExportVehicle };
