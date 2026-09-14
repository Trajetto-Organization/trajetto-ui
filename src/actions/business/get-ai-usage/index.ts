"use server";

import { getCookies } from "../../cookies";

interface AIUsageData {
  ai_analysis_limit: number;

  /** Completed verifications only. */
  ai_analysis_used: number;

  /** Reserved by analyses still running; returns to the pool on failure. */
  ai_analysis_in_progress?: number;
  ai_analysis_reset_at: string | null;
}

interface AIUsageResponse {
  success: boolean;
  message: string;
  data?: AIUsageData;
}

const getAIUsage = async (businessId: string): Promise<AIUsageResponse> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      success: false,
      message: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  try {
    const response = await fetch(
      `${process.env.HTTP_REQUEST}/business/get-ai-usage/${businessId}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        next: { tags: ["update-ai-usage"] },
      },
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message:
          result.message ||
          "Houve um erro ao tentar obter os dados de uso da verificação IA.",
      };
    }

    return {
      success: true,
      message: "Dados de uso obtidos com sucesso.",
      data: result.data as AIUsageData,
    };
  } catch (error) {
    return {
      success: false,
      message:
        "Ocorreu um erro inesperado ao tentar obter os dados de uso da verificação IA.",
    };
  }
};

export { getAIUsage };
export type { AIUsageData, AIUsageResponse };
