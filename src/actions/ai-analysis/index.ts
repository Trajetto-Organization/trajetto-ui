"use server";

import { getCookies } from "../cookies";

type AIRecordType = "fuel" | "checklist";

interface RequestAIVerificationResponse {
  success: boolean;
  message: string;
  outcome?: string;
}

interface AIAnalysisProgress {
  status:
    | "none"
    | "PENDING"
    | "PROCESSING"
    | "COMPLETED"
    | "PARTIAL"
    | "FAILED"
    | "SKIPPED";
  unitsTotal: number;
  unitsCompleted: number;
  attempts: number;
  availableAt: string | null;
  lastError: string | null;
}

interface AIAnalysisProgressResponse {
  success: boolean;
  message: string;
  data?: AIAnalysisProgress;
}

/** The "verificar com IA" button: starts or revives a record's analysis. */
const requestAIVerification = async (
  recordType: AIRecordType,
  recordId: string,
): Promise<RequestAIVerificationResponse> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      success: false,
      message: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  try {
    const response = await fetch(
      `${process.env.HTTP_REQUEST}/ai-analysis/request/${recordType}/${recordId}`,
      {
        credentials: "include",
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
        },
      },
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message:
          result.message || "Houve um erro ao solicitar a verificação IA.",
      };
    }

    return {
      success: true,
      message: result.message || "Verificação IA iniciada.",
      outcome: result.outcome,
    };
  } catch (error) {
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao solicitar a verificação IA.",
    };
  }
};

/**
 * Durable progress of the latest analysis — restores "X de Y fotos" in the
 * details dialog after a page refresh, when the websocket history is gone.
 */
const getAIVerificationProgress = async (
  recordType: AIRecordType,
  recordId: string,
): Promise<AIAnalysisProgressResponse> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      success: false,
      message: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  try {
    const response = await fetch(
      `${process.env.HTTP_REQUEST}/ai-analysis/progress/${recordType}/${recordId}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
        },
        cache: "no-store",
      },
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message:
          result.message || "Houve um erro ao consultar o progresso da IA.",
      };
    }

    return {
      success: true,
      message: "Progresso obtido com sucesso.",
      data: result.data as AIAnalysisProgress,
    };
  } catch (error) {
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao consultar o progresso da IA.",
    };
  }
};

export { requestAIVerification, getAIVerificationProgress };
export type { AIAnalysisProgress, AIRecordType };
