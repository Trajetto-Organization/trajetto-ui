"use server";

import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { parseNDJSON } from "@/lib/parse-nd-json";
import { apiFetch } from "@/lib/api-fetch";

interface ShipperData {
  id: string;
  name: string;
  cnpj: string | null;
  email: string | null;
  telephone: string | null;
  is_active: boolean;
  businessId: string;
  created_at: string;
  updated_at: string;
}

interface ShipperListData {
  data: ShipperData[];
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

const listShippers = async (
  businessId: string,
  page: number,
  pageSize: number,
  search?: string,
): Promise<ActionResponse<ShipperListData>> => {
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
      `${process.env.HTTP_REQUEST}/shipper/list-shipper?${params}`,
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
        message: result.message || "Houve um erro ao listar os embarcadores.",
      };
    }

    // The list routes stream NDJSON (meta first, then one row per line).
    const { meta, data } = await parseNDJSON(response);

    return {
      success: true,
      message: "Embarcadores obtidos com sucesso.",
      data: {
        data,
        total: meta?.total ?? data.length,
        currentPage: meta?.page ?? page,
        pageSize: meta?.pageSize ?? pageSize,
        totalPages: meta?.totalPages ?? 1,
      } as ShipperListData,
    };
  } catch (error) {
    logActionError("shipper/list-shipper", error);
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao listar os embarcadores.",
    };
  }
};

export { listShippers };
export type { ShipperData, ShipperListData };
