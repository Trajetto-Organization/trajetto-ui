"use server";

import { getCookies } from "../../cookies";

interface ExportFineExcelResponse {
  success?: boolean;
  message?: string;
  base64Data?: string;
  filename?: string;
  totalRecords?: number;
}

const handleExportFineExcel = async (
  search?: string,
): Promise<ExportFineExcelResponse> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      success: false,
      message: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  try {
    const queryString = search ? `?search=${encodeURIComponent(search)}` : "";
    const exportUrl = `${process.env.HTTP_REQUEST}/fines/export-fine-excel${queryString}`;

    const response = await fetch(exportUrl, {
      credentials: "include",
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      return {
        success: false,
        message: `Erro ao gerar relatório: ${response.status} - ${errorData}`,
      };
    }

    // Get important headers
    const contentDisposition = response.headers.get("content-disposition");
    const totalRecords = response.headers.get("X-Total-Records");

    // Extract filename from content-disposition
    const filename = contentDisposition
      ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
      : `relatorio-multas-${new Date().toISOString().split("T")[0]}.xlsx`;

    // Convert response to base64 for client transfer
    const arrayBuffer = await response.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    return {
      success: true,
      base64Data,
      filename,
      totalRecords: totalRecords ? parseInt(totalRecords) : 0,
      message: `Relatório gerado com sucesso! ${totalRecords || 0} multa(s) incluída(s).`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Ocorreu um erro inesperado: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
    };
  }
};

export { handleExportFineExcel };
