"use server";

import { getCookies } from "../../cookies";

interface HealthMetricsData {
  timestamp: string;
  database: {
    active_connections: number;
    max_connections: number;
    connection_usage_percent: number;
  };
  outbox: {
    pending: number;
    failed: number;
    oldest_pending_seconds: number | null;
  };
  ai_pipeline: {
    pending: number;
    running: number;
  };
}

interface HealthMetricsResponse {
  success: boolean;
  message: string;
  data?: HealthMetricsData;
}

const getHealthMetrics = async (): Promise<HealthMetricsResponse> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      success: false,
      message: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  try {
    const response = await fetch(
      `${process.env.HTTP_REQUEST}/health/metrics`,
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
          result.message || "Houve um erro ao obter as métricas do sistema.",
      };
    }

    return {
      success: true,
      message: "Métricas obtidas com sucesso.",
      data: result as HealthMetricsData,
    };
  } catch (error) {
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao obter as métricas do sistema.",
    };
  }
};

export { getHealthMetrics };
export type { HealthMetricsData };
