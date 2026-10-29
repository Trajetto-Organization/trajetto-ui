"use server";

// Deprecated: the screen downloads this export through the relay, streamed
// (src/lib/export-download.ts, src/lib/export-requests.ts). Kept for one
// release only for the tabs opened before the deploy, which still call this
// action (expand, then contract); remove it in the next release.

import { logActionError } from "@/lib/log-action-error";
import { readBusinessIdParam } from "@/lib/business-id-param";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface ExportAccountPayableRequest {
  /** The MASTER's selected company; absent on /dashboard (the session's). */
  businessId?: string;
  search?: string;
  format?: "csv" | "excel";
  /** The list's own sort and filter params (status, category, sort, order). */
  filters?: Record<string, string>;
}

interface ExportAccountPayableResponse {
  success?: boolean;
  message?: string;
  base64Data?: string;
  filename?: string;
  totalRecords?: number;
  mimeType?: string;
}

/** Only the params the API's export schema knows travel. */
const FORWARDED = ["status", "category", "sort", "order"] as const;

/**
 * The accounts payable report with the list's search, filters and order
 * (decision 5.8), for the company on screen — the MASTER's selected one too.
 */
const handleExportAccountPayable = async ({
  businessId,
  search,
  format = "csv",
  filters = {},
}: ExportAccountPayableRequest): Promise<ExportAccountPayableResponse> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      success: false,
      message: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const params = new URLSearchParams({ format });
  const company = readBusinessIdParam(businessId);

  if (company) params.set("businessId", company);
  if (search) params.set("search", search);

  for (const name of FORWARDED) {
    if (filters[name]) params.set(name, filters[name]);
  }

  try {
    const response = await apiFetch(
      `${process.env.HTTP_REQUEST}/account-payable/export-account-payable?${params.toString()}`,
      {
        credentials: "include",
        method: "GET",
        headers: { Authorization: `Bearer ${tokenAccess}` },
      },
    );

    if (!response.ok) {
      const body = await response.json().catch(() => null);

      return {
        success: false,
        message:
          (body && typeof body.message === "string" && body.message) ||
          "Não foi possível gerar o relatório de contas a pagar.",
      };
    }

    const contentDisposition = response.headers.get("content-disposition");
    const mimeType = response.headers.get("content-type") || "";
    const totalRecords = response.headers.get("X-Total-Records");

    const filename = contentDisposition
      ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
      : `relatorio-contas-a-pagar.${format === "csv" ? "csv" : "xlsx"}`;

    const base64Data = Buffer.from(await response.arrayBuffer()).toString(
      "base64",
    );

    return {
      success: true,
      base64Data,
      filename,
      totalRecords: totalRecords ? parseInt(totalRecords, 10) : 0,
      mimeType,
      message: "Relatório gerado com sucesso!",
    };
  } catch (error) {
    logActionError("account-payable/export-account-payable", error);

    return {
      success: false,
      message:
        "Ocorreu um erro inesperado ao gerar o relatório de contas a pagar.",
    };
  }
};

export { handleExportAccountPayable };
