"use server";

import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";

import type { ImportData } from "../list-imports";
import type { ImportReport } from "../import-spreadsheet";
import { apiFetch } from "@/lib/api-fetch";

interface ActionResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
}

/**
 * One upload with its per-row report, read when the operator opens it.
 *
 * The history listing no longer carries the report: it is one entry per
 * spreadsheet line, and a page of big days was megabytes to draw four numbers
 * per row. This reads the report of the one upload being looked at.
 */
const getImport = async (
  importId: string,
  businessId: string,
): Promise<ActionResponse<ImportData & { report: ImportReport }>> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      success: false,
      message: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  try {
    const response = await apiFetch(
      `${process.env.HTTP_REQUEST}/import/get-import/${importId}/business/${businessId}`,
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

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        message:
          result.message ||
          "Não foi possível carregar o relatório desta importação.",
      };
    }

    return {
      success: true,
      message: "Relatório obtido com sucesso.",
      data: result.data,
    };
  } catch (error) {
    logActionError("import/get-import", error);
    return {
      success: false,
      message: "Não foi possível carregar o relatório desta importação.",
    };
  }
};

export { getImport };
