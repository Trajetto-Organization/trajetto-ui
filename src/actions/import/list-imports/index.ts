"use server";

import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { parseNDJSON } from "@/lib/parse-nd-json";

import type { ImportReport } from "../import-spreadsheet";
import { apiFetch } from "@/lib/api-fetch";

interface ImportData {
  id: string;
  source: "SPREADSHEET" | "NFE_XML";

  /**
   * IN_PROGRESS means the upload is still writing its rows. The screen shows
   * it and offers no undo, because the undo would delete deliveries while the
   * import is still creating them.
   */
  status: "IN_PROGRESS" | "COMPLETED" | "REVERSED";

  filename: string;

  imported: number;
  duplicated: number;
  invalid: number;

  /**
   * Absent from the listing, which asks for the counters only: the report
   * has one entry per spreadsheet line. The dialog reads it with getImport
   * when it opens. An API from before that change still sends it here, and
   * the dialog uses it when it is present.
   */
  report?: ImportReport;

  reversed_at: string | null;

  businessId: string;
  performedById: string;

  created_at: string;
}

interface ImportListData {
  data: ImportData[];
  total: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
}

interface ActionResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
}

const listImports = async (
  businessId: string,
  page: number,
  pageSize: number,
): Promise<ActionResponse<ImportListData>> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      success: false,
      message: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  try {
    const params = new URLSearchParams({
      businessId,
      page: String(page),
      pageSize: String(pageSize),

      // The table shows counters; the per-row report of one upload comes
      // from getImport when the operator opens it.
      includeReport: "false",
    });

    const response = await apiFetch(
      `${process.env.HTTP_REQUEST}/import/list-imports?${params}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const result = await response.json();

      return {
        success: false,
        message: result.message || "Houve um erro ao listar as importações.",
      };
    }

    // The list routes stream NDJSON (meta first, then one row per line).
    const { meta, data } = await parseNDJSON(response);

    return {
      success: true,
      message: "Importações obtidas com sucesso.",
      data: {
        data,
        total: meta?.total ?? data.length,
        currentPage: meta?.page ?? page,
        pageSize: meta?.pageSize ?? pageSize,
        totalPages: meta?.totalPages ?? 1,
      } as ImportListData,
    };
  } catch (error) {
    logActionError("import/list-imports", error);
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao listar as importações.",
    };
  }
};

export { listImports };
export type { ImportData, ImportListData };
