"use server";

import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { parseNDJSON } from "@/lib/parse-nd-json";
import { apiFetch } from "@/lib/api-fetch";

interface OccurrenceTypeData {
  id: string;
  name: string;
  description: string | null;
  requires_photo: boolean;
  blocks_delivery: boolean;
  is_active: boolean;
  /** The platform's own type ("Comprovante rejeitado"): history, never offered. */
  is_system?: boolean;
  /** Decision 6.3: the driver's report waits for the tower. */
  requires_authorization?: boolean;
  /** Decision 6.2: the stored form (normalized) or null; read with readFormFields. */
  form_fields?: unknown;
  form_version?: number;
  /** Decision 14.3: Entrega / Não entrega / Pausa (absent on an old API: NOT_DELIVERED). */
  category?: "DELIVERED" | "NOT_DELIVERED" | "PAUSE";
  requires_receipt_photo?: boolean;
  requires_signature?: boolean;
  /** Decision 14.4: the legal nature of a pause type. */
  pause_kind?: "MEAL" | "REST" | "OTHER" | null;
  /** A seeded default: editable and deactivatable, never deletable. */
  is_default?: boolean;
  /** An occurrence or a pause names it: category and nature are locked. */
  in_use?: boolean;
  deactivated_at?: string | null;
  businessId: string;
  created_at: string;
  updated_at: string;
}

interface OccurrenceTypeListData {
  data: OccurrenceTypeData[];
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

const listOccurrenceTypes = async (
  businessId: string,
  page: number,
  pageSize: number,
  search?: string,
): Promise<ActionResponse<OccurrenceTypeListData>> => {
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
      `${process.env.HTTP_REQUEST}/occurrence-type/list-occurrence-type?${params}`,
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
        message:
          result.message || "Houve um erro ao listar os tipos de ocorrência.",
      };
    }

    // The list routes stream NDJSON (meta first, then one row per line).
    const { meta, data } = await parseNDJSON(response);

    return {
      success: true,
      message: "Tipos de ocorrência obtidos com sucesso.",
      data: {
        data,
        total: meta?.total ?? data.length,
        currentPage: meta?.page ?? page,
        pageSize: meta?.pageSize ?? pageSize,
        totalPages: meta?.totalPages ?? 1,
      } as OccurrenceTypeListData,
    };
  } catch (error) {
    logActionError("occurrence-type/list-occurrence-type", error);
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao listar os tipos de ocorrência.",
    };
  }
};

export { listOccurrenceTypes };
export type { OccurrenceTypeData, OccurrenceTypeListData };
