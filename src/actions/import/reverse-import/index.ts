"use server";

import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface ReversalResult {
  removedDeliveries: number;
  removedRoutes: number;

  /** What survived the undo, and why — shown row by row on the screen. */
  keptDeliveries: Array<{
    id: string;
    recipient_name: string;
    reason: string;
  }>;
  keptRoutes: Array<{ id: string; code: number; reason: string }>;
}

interface ActionResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;

  /**
   * The API took the undo to the background (202: more than 500 deliveries
   * to remove). The screen follows it on GET /import/get-import until
   * `reversal.state` says DONE.
   */
  pending?: boolean;
}

/**
 * Takes an upload back, as far as it still can be taken back.
 *
 * Partial on purpose: a file loaded at 6am and undone at 6:10 is usually
 * untouched, one undone at noon has had half its deliveries worked. Refusing
 * the whole undo over three rows out of two hundred would leave the operator
 * deleting the other hundred and ninety-seven by hand.
 */
const reverseImport = async (
  businessId: string,
  importId: string,
): Promise<ActionResponse<ReversalResult>> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      success: false,
      message: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  try {
    const response = await apiFetch(
      `${process.env.HTTP_REQUEST}/import/reverse-import/${importId}/business/${businessId}`,
      {
        credentials: "include",
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
      },
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.message || "Houve um erro ao estornar a importação.",
      };
    }

    // Large undos run in batches in the background (28/10/2026): the body
    // is the progress, not the result.
    if (response.status === 202) {
      return {
        success: true,
        pending: true,
        message: result.message || "Estorno em andamento.",
      };
    }

    return { success: true, message: result.message, data: result.data };
  } catch (error) {
    logActionError("import/reverse-import", error);
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao estornar a importação.",
    };
  }
};

export { reverseImport };
export type { ReversalResult };
