"use server";

import { getCookies } from "../../cookies";

interface ActionResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
}

/**
 * What happened to one line, as the operator reads it.
 *
 * `line` is the number in the corner of their spreadsheet, not an index: an
 * error that says "linha 4" when the header is line 1 sends somebody to the
 * wrong row, and they fix the wrong thing.
 */
interface ImportRowResult {
  line: number;
  outcome: "imported" | "duplicated" | "invalid";

  recipient_name: string | null;
  reference: string | null;

  message: string | null;
}

interface ImportReport {
  imported: number;
  duplicated: number;
  invalid: number;

  /** Columns we did not recognise. Never fatal, always shown. */
  unknownHeaders: string[];

  rows: ImportRowResult[];

  routes: Array<{
    id: string;
    code: number;
    name: string | null;
    stops: number;
  }>;
}

interface ImportSpreadsheetResult {
  id: string;
  imported: number;
  duplicated: number;
  invalid: number;
  report: ImportReport;
}

const importSpreadsheet = async (
  businessId: string,
  file: { filename: string; content: string },
  shipperId: string,
): Promise<ActionResponse<ImportSpreadsheetResult>> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      success: false,
      message: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  try {
    const response = await fetch(
      `${process.env.HTTP_REQUEST}/import/import-spreadsheet/${businessId}`,
      {
        credentials: "include",
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...file, shipperId }),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.message || "Houve um erro ao importar a planilha.",
      };
    }

    return { success: true, message: result.message, data: result.data };
  } catch (error) {
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao importar a planilha.",
    };
  }
};

export { importSpreadsheet };
export type { ImportReport, ImportRowResult, ImportSpreadsheetResult };
