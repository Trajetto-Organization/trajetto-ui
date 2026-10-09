"use server";

import { logActionError } from "@/lib/log-action-error";
import { readBusinessIdParam } from "@/lib/business-id-param";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface ExportFineResponse {
  success?: boolean;
  message?: string;
  base64Data?: string;
  filename?: string;
  totalRecords?: number;
  mimeType?: string;
}

type ExportFormat = "csv" | "excel";

interface ExportFineRequest {
  search?: string;
  format?: ExportFormat;
  /** The company on screen: required for the MASTER (decision 5.8). */
  businessId?: string;
  /** The list's filter params, so the file holds what the screen shows. */
  filters?: Record<string, string>;
}

/** Only the list's own filter params travel; anything else is dropped. */
const FILTER_PARAMS = ["status", "branchId", "trafficViolationCodeId"];

const handleExportFine = async ({
  search,
  format = "csv",
  businessId,
  filters = {},
}: ExportFineRequest): Promise<ExportFineResponse> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      success: false,
      message: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  try {
    const params = new URLSearchParams({ format });

    if (search) params.set("search", search);

    const company = readBusinessIdParam(businessId);
    if (company) params.set("businessId", company);

    for (const name of FILTER_PARAMS) {
      if (filters[name]) params.set(name, filters[name]);
    }

    const exportUrl = `${process.env.HTTP_REQUEST}/fines/export-fine?${params.toString()}`;
    const response = await apiFetch(exportUrl, {
      credentials: "include",
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    if (!response.ok) {
      // The API's own sentence, never the raw body: the toast used to read
      // `Erro ao gerar relatório: 400 - {"message":…}`.
      const body = await response.json().catch(() => null);

      return {
        success: false,
        message:
          (body && typeof body.message === "string" && body.message) ||
          "Não foi possível gerar o relatório de multas.",
      };
    }

    const contentDisposition = response.headers.get("content-disposition");
    const mimeType = response.headers.get("content-type") || "";

    const totalRecords = response.headers.get("X-Total-Records");
    const filename = contentDisposition
      ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
      : `relatorio-multas.${format === "csv" ? "csv" : "xlsx"}`;

    const arrayBuffer = await response.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    return {
      success: true,
      base64Data,
      filename,
      totalRecords: totalRecords ? parseInt(totalRecords) : 0,
      mimeType,
      message: "Relatório gerado com sucesso!",
    };
  } catch (error) {
    logActionError("fine/export-fine", error);
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao gerar o relatório de multas.",
    };
  }
};

export { handleExportFine };
