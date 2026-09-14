"use server";

import { getCookies } from "../../cookies";

interface ActivitySummaryData {
  total: number;
  created: number;
  updated: number;
  deleted: number;
  activeUsers: number;
  topType: string | null;
  topTypeCount: number;
  periodDays: number;
}

interface ActivitySummaryResponse {
  success: boolean;
  message: string;
  data?: ActivitySummaryData;
}

const getActivitySummary = async (
  period: "7d" | "30d",
  businessId?: string,
): Promise<ActivitySummaryResponse> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      success: false,
      message: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  try {
    const params = new URLSearchParams({
      period,
      ...(businessId && { businessId }),
    });

    const response = await fetch(
      `${process.env.HTTP_REQUEST}/activity/summary?${params}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        next: { tags: ["update-activity"] },
      },
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message:
          result.message || "Houve um erro ao obter o resumo de atividades.",
      };
    }

    return {
      success: true,
      message: "Resumo obtido com sucesso.",
      data: result.data as ActivitySummaryData,
    };
  } catch (error) {
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao obter o resumo de atividades.",
    };
  }
};

export { getActivitySummary };
export type { ActivitySummaryData };
