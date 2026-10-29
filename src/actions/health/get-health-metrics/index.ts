"use server";

import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

/**
 * One delivery channel on /health/metrics. `pending`..`failed` count what was
 * CREATED in the window (24 h); the `*_total` and `oldest_*` fields are the
 * current backlog, whatever its age. Optional where the API added them later:
 * the web deploys apart from the API and must read an older one too.
 */
interface ChannelDeliveryMetrics {
  channel: string;
  pending: number;
  processing: number;
  delivered: number;
  failed: number;
  failed_total: number;
  pending_total?: number;
  processing_lease_expired?: number;
  oldest_pending_seconds?: number | null;
  oldest_eligible_seconds?: number | null;
}

interface WebhookQueueMetrics {
  pending_due: number;
  held: number;
  oldest_due_seconds: number | null;
  disabled_endpoints: number;
  failed_24h?: number;
}

interface WorkerMetrics {
  replica: string;
  worker: string;
  last_beat_at: string;
  running_since: string | null;
  last_seen_at: string;
  stuck: boolean;
}

interface CronJobMetrics {
  job: string;
  schedule: string | null;
  last_status: "RUNNING" | "SUCCEEDED" | "FAILED" | null;
  last_scheduled_for: string | null;
  last_finished_at: string | null;
  last_succeeded_at: string | null;
  attempts: number | null;
  last_error: string | null;
  stale_running: number;
}

interface PoolMetrics {
  limit: number | null;
  open: number;
  busy: number;
  idle: number;
  waiting: number;
}

interface RuntimeMetrics {
  replica: string;
  window_seconds: number;
  event_loop: {
    lag_p50_ms: number | null;
    lag_p99_ms: number | null;
    lag_max_ms: number | null;
    utilization: number;
  };
  threadpool: {
    size: number;
    canary_last_ms: number | null;
    canary_max_ms: number | null;
  };
  memory: { rss_mb: number; heap_used_mb: number };
  prisma_pool: PoolMetrics;
}

/** Calls this replica made to one provider in the last window (contract §32). */
interface ProviderChannelMetrics {
  channel: "EMAIL" | "WHATSAPP" | "PUSH" | "AI_OCR" | "WEBHOOK";
  calls: number;
  errors: number;
  /** 0..1; null without a call in the window (unknown, not zero). */
  error_rate: number | null;
  latency_p50_ms: number | null;
  latency_p95_ms: number | null;
  latency_max_ms: number | null;
  total_calls: number;
  total_errors: number;
  last_error_at: string | null;
  last_error_kind: string | null;
}

interface RealtimeMetrics {
  local_connections: number;
  adapter: "redis" | "local" | "off";
  adapter_status: string | null;
  dropped_frames_unreported: number;
}

interface RedisMetrics {
  status: "up" | "down";
  latency_ms: number | null;
  used_memory_mb: number | null;
  maxmemory_mb: number | null;
  connected_clients: number | null;
  blocked_clients: number | null;
  rejected_connections: number | null;
  evicted_keys: number | null;
  uptime_seconds: number | null;
}

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
    /** Lag of what is already due — blind while everything is in backoff. */
    oldest_pending_seconds: number | null;
    /** Age of the oldest pending event, from creation: the honest lag. */
    oldest_pending_any_seconds?: number | null;
  };
  ai_pipeline: {
    pending: number;
    running: number;
    failed_24h?: number;
  };
  notifications?: {
    window_hours: number;
    failed_total: number;
    channels: ChannelDeliveryMetrics[];
    /** WhatsApp Meta accepted and then reported failed, last 24 h (OUTBOX-07). */
    whatsapp_failed_24h?: number;
    /** Deliveries that reached Meta more than once, last 24 h (OUTBOX-07). */
    whatsapp_multi_send_24h?: number;
  };
  webhooks?: WebhookQueueMetrics;
  workers?: WorkerMetrics[];
  cron_jobs?: CronJobMetrics[];
  driver_position?: {
    partition_runway_days: number | null;
    last_partition_ends_at: string | null;
    runway_ok: boolean;
  };
  runtime?: RuntimeMetrics;
  // Optional: the web deploys apart from the API and must read an older one.
  providers?: {
    replica: string;
    window_minutes: number;
    channels: ProviderChannelMetrics[];
  };
  realtime?: RealtimeMetrics;
  redis?: RedisMetrics;
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
    const response = await apiFetch(
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
    logActionError("health/get-health-metrics", error);
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao obter as métricas do sistema.",
    };
  }
};

export { getHealthMetrics };
export type {
  ChannelDeliveryMetrics,
  CronJobMetrics,
  HealthMetricsData,
  PoolMetrics,
  ProviderChannelMetrics,
  RealtimeMetrics,
  RedisMetrics,
  RuntimeMetrics,
  WebhookQueueMetrics,
  WorkerMetrics,
};
