"use server";

import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface AIUsageData {
  ai_analysis_limit: number;

  /** Photos analysed (one quota unit per photo), finished calls only. */
  ai_analysis_used: number;

  /** Reserved by analyses still running; returns to the pool on failure. */
  ai_analysis_in_progress?: number;

  /** When the current period began: 00:00 of day 1 in the company's zone. */
  ai_analysis_reset_at: string | null;

  /** When the quota resets: 00:00 of next month's day 1, company's zone. */
  ai_analysis_next_reset_at?: string | null;
  ai_analysis_timezone?: string | null;

  /** Photos analysed this period, per kind of record (AI-10). */
  ai_analysis_used_by_type?: { fuel: number; checklist: number; proof: number };
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
    const response = await apiFetch(
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
    logActionError("business/get-ai-usage", error);
    return {
      success: false,
      message:
        "Ocorreu um erro inesperado ao tentar obter os dados de uso da verificação IA.",
    };
  }
};

export { getAIUsage };
export type { AIUsageData, AIUsageResponse };
