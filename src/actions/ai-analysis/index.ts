"use server";

import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../cookies";
import { apiFetch } from "@/lib/api-fetch";

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

  /** Why it waits or how it ended (the API's stable code). */
  lastErrorCode?:
    | "AI_PROVIDER_PAUSED"
    | "AI_INPUT_SUPERSEDED"
    | "AI_QUOTA_EXCEEDED"
    | "AI_INVALID_RESPONSE"
    | "AI_ANALYSIS_ERROR"
    | null;

  /** The API's own pt-BR sentence for lastErrorCode, never the provider's. */
  lastError: string | null;

  /** Waiting on the provider (spend or usage limit), not on the queue. */
  paused?: boolean;

  /** The record's company has AI readings on. */
  aiEnabled?: boolean;

  /** This user may ask for a reading (write permission, not a driver). */
  canRequest?: boolean;
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
    const response = await apiFetch(
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
    logActionError("ai-analysis/requestAIVerification", error);
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
    const response = await apiFetch(
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
    logActionError("ai-analysis/getAIVerificationProgress", error);
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao consultar o progresso da IA.",
    };
  }
};

export { requestAIVerification, getAIVerificationProgress };
export type { AIAnalysisProgress, AIRecordType };
