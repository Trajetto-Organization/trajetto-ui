"use server";

import { getCookies } from "../../cookies";
import { parseNDJSON } from "@/lib/parse-nd-json";

interface OccurrenceTypeData {
  id: string;
  name: string;
  description: string | null;
  requires_photo: boolean;
  blocks_delivery: boolean;
  is_active: boolean;
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

    const response = await fetch(
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
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao listar os tipos de ocorrência.",
    };
  }
};

export { listOccurrenceTypes };
export type { OccurrenceTypeData, OccurrenceTypeListData };
