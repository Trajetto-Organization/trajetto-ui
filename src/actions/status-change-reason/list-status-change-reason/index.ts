"use server";

import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { parseNDJSON } from "@/lib/parse-nd-json";
import { apiFetch } from "@/lib/api-fetch";

interface StatusChangeReasonData {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  businessId: string;
  created_at: string;
  updated_at: string;
}

interface StatusChangeReasonMeta {
  total: number;
  active: number;

  /**
   * How many reasons already explain a change in the history.
   *
   * The number that separates the vocabulary a company actually speaks from
   * the words somebody typed once and forgot — and the one that says which
   * reasons can still be deleted.
   */
  used: number;
}

interface StatusChangeReasonListData {
  data: StatusChangeReasonData[];
  total: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  meta?: StatusChangeReasonMeta;
}

interface ActionResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
}

const listStatusChangeReasons = async (
  businessId: string,
  page: number,
  pageSize: number,
  search?: string,
): Promise<ActionResponse<StatusChangeReasonListData>> => {
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
      ...(search && { search }),
    });

    const response = await apiFetch(
      `${process.env.HTTP_REQUEST}/status-change-reason/list-status-change-reason?${params}`,
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
        message: result.message || "Houve um erro ao listar os motivos.",
      };
    }

    // The list routes stream NDJSON (meta first, then one row per line).
    const { meta, data } = await parseNDJSON(response);

    return {
      success: true,
      message: "Motivos obtidos com sucesso.",
      data: {
        data,
        total: meta?.total ?? data.length,
        currentPage: meta?.page ?? page,
        pageSize: meta?.pageSize ?? pageSize,
        totalPages: meta?.totalPages ?? 1,
        meta: meta?.searchMeta,
      } as StatusChangeReasonListData,
    };
  } catch (error) {
    logActionError("status-change-reason/list-status-change-reason", error);
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao listar os motivos.",
    };
  }
};

export { listStatusChangeReasons };
export type {
  StatusChangeReasonData,
  StatusChangeReasonListData,
  StatusChangeReasonMeta,
};
