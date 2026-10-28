"use server";

import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

/**
 * One provider on /health/providers: configured, answering, and what to do.
 * Names of variables and states only — the API never sends a value.
 */
type ProviderReadinessStatus =
  "ok" | "warning" | "error" | "not_configured" | "disabled";

/** What the last failed probe attempt hit (the API's `failure_kind`). */
type ProviderProbeFailureKind =
  "timeout" | "network" | "http_5xx" | "throttled" | "invalid_response";

interface ProviderReadiness {
  key:
    | "email"
    | "whatsapp"
    | "push"
    | "storage"
    | "ai_ocr"
    | "proof_certificate"
    | "heartbeat";
  label: string;
  status: ProviderReadinessStatus;
  configured: boolean;
  reachable: boolean | null;
  latency_ms: number | null;
  missing_env: string[];
  message: string;
  warnings: string[];
  details: Record<string, string | number | boolean | null>;

  /**
   * How the verdict was reached. Absent from an older API, which reads as
   * "one attempt, nothing passing".
   */
  attempts?: number;

  /** The verdict rests on a passing condition; the next probe may differ. */
  transient?: boolean;
  failure_kind?: ProviderProbeFailureKind | null;
}

interface ProviderReadinessData {
  checked_at: string;
  cached: boolean;
  providers: ProviderReadiness[];
}

interface ProviderReadinessResponse {
  success: boolean;
  message: string;
  data?: ProviderReadinessData;
}

/**
 * `refresh` skips the API's 30-second cache. The probes call Resend, Meta,
 * Expo, R2 and the OCR service, so the screen only asks for it on the
 * explicit "Atualizar".
 */
const getHealthProviders = async (
  refresh = false,
): Promise<ProviderReadinessResponse> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      success: false,
      message: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  try {
    const response = await apiFetch(
      `${process.env.HTTP_REQUEST}/health/providers${refresh ? "?refresh=true" : ""}`,
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

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message:
          result.message ||
          "Houve um erro ao verificar os provedores externos.",
      };
    }

    return {
      success: true,
      message: "Provedores verificados com sucesso.",
      data: result as ProviderReadinessData,
    };
  } catch (error) {
    logActionError("health/get-health-providers", error);
    return {
      success: false,
      message:
        "Ocorreu um erro inesperado ao verificar os provedores externos.",
    };
  }
};

export { getHealthProviders };
export type {
  ProviderProbeFailureKind,
  ProviderReadiness,
  ProviderReadinessData,
  ProviderReadinessStatus,
};
