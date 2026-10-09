import type {
  ChannelDeliveryMetrics,
  CronJobMetrics,
  HealthMetricsData,
  PoolMetrics,
  ProviderChannelMetrics,
  RedisMetrics,
  WorkerMetrics,
} from "@/actions/health/get-health-metrics";
import type {
  ProviderReadiness,
  ProviderReadinessStatus,
} from "@/actions/health/get-health-providers";

/**
 * The decisions of the "Sistema" tab, apart from the markup so they can be
 * tested (OBS-04, OUTBOX-15, OBS-10, OBS-11).
 *
 * Every rule reads an older API payload too — the web deploys apart from the
 * API — and treats a missing number as "unknown", never as "zero, all good".
 */

type Tone = "green" | "yellow" | "red";

interface Status {
  label: string;
  tone: Tone;
}

/** Past a minute something is piling up; past five it is late. */
const QUEUE_WARN_SECONDS = 60;
const QUEUE_LATE_SECONDS = 300;

const max = (values: Array<number | null | undefined>): number | null => {
  const known = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value),
  );

  return known.length > 0 ? Math.max(...known) : null;
};

/**
 * The badge of the queues: the WORST age of anything waiting, across the
 * outbox, every delivery channel and the webhooks.
 *
 * The outbox alone is blind to a provider outage — an event turns PUBLISHED
 * as soon as it fans out, whatever happens to its deliveries — and its
 * "eligible" lag is null exactly while everything is in backoff. So the ages
 * used here are measured from creation, and "Sem fila" is said only when no
 * count at all is above zero.
 */
function queueStatus(metrics: HealthMetricsData): Status {
  const channels = metrics.notifications?.channels ?? [];

  const waiting =
    metrics.outbox.pending +
    channels.reduce(
      (total, channel) =>
        total + (channel.pending_total ?? channel.pending) + channel.processing,
      0,
    ) +
    (metrics.webhooks?.pending_due ?? 0);

  const oldest = max([
    metrics.outbox.oldest_pending_any_seconds ??
      metrics.outbox.oldest_pending_seconds,
    ...channels.map((channel) => channel.oldest_pending_seconds),
    metrics.webhooks?.oldest_due_seconds,
  ]);

  if (oldest === null) {
    return waiting > 0
      ? // Something waits and the API gives no age for it (an older API, or
        // everything in backoff): not green.
        { label: "Aguardando", tone: "yellow" }
      : { label: "Sem fila", tone: "green" };
  }

  if (oldest >= QUEUE_LATE_SECONDS) return { label: "Atrasado", tone: "red" };
  if (oldest >= QUEUE_WARN_SECONDS)
    return { label: "Acumulando", tone: "yellow" };

  return { label: "Em dia", tone: "green" };
}

/**
 * Channels an operator should look at: failures today, a backlog older than
 * five minutes, or a worker that died mid-send (an expired lease).
 */
function channelWarnings(
  channels: ChannelDeliveryMetrics[],
): ChannelDeliveryMetrics[] {
  return channels.filter(
    (channel) =>
      channel.failed > 0 ||
      (channel.oldest_pending_seconds ?? 0) >= QUEUE_LATE_SECONDS ||
      (channel.processing_lease_expired ?? 0) > 0,
  );
}

/**
 * What Meta said after it accepted a WhatsApp (OUTBOX-07): messages it failed
 * later and deliveries it received more than once. Neither shows in the
 * per-channel table — both deliveries read DELIVERED, since the provider
 * took the message. Null from an API that does not report them: unknown, not
 * zero.
 */
function whatsappAfterAcceptance(
  notifications: HealthMetricsData["notifications"],
): { failed: number; multiSend: number; warn: boolean } | null {
  const failed = notifications?.whatsapp_failed_24h;
  const multiSend = notifications?.whatsapp_multi_send_24h;

  if (typeof failed !== "number" || typeof multiSend !== "number") return null;

  return { failed, multiSend, warn: failed > 0 || multiSend > 0 };
}

/**
 * This replica's Prisma pool. Saturated when a query is waiting for a
 * connection or every slot is busy — the moment requests start queueing
 * inside the API, long before Postgres' max_connections says anything.
 */
function poolStatus(pool: PoolMetrics | undefined): Status | null {
  if (!pool) return null;

  if (pool.waiting > 0 || (pool.limit !== null && pool.busy >= pool.limit)) {
    return { label: "Saturado", tone: "red" };
  }

  if (pool.limit !== null && pool.busy / pool.limit >= 0.7) {
    return { label: "Atenção", tone: "yellow" };
  }

  return { label: "Folgado", tone: "green" };
}

function stuckWorkers(workers: WorkerMetrics[] | undefined): WorkerMetrics[] {
  return (workers ?? []).filter((worker) => worker.stuck);
}

/** A nightly job missing a night, plus slack. */
const CRON_SUCCESS_MAX_AGE_MS = 26 * 60 * 60 * 1000;

/**
 * Jobs that need a look: a run left behind by a dead replica, a last run that
 * failed, or no success in 26 hours — for driver-position-partitions that is
 * the runway of the GPS trail shrinking.
 *
 * Only jobs the API still schedules: a removed or renamed job keeps its rows
 * for the 30 days of the purge (schedule null) and would read "late" all that
 * time. Unless no job has a schedule at all: then the replica that answered
 * runs no cron (an HTTP-only replica, WORKERS_ENABLED=false) and null says
 * nothing about the job.
 */
function cronAlerts(
  jobs: CronJobMetrics[] | undefined,
  now: Date = new Date(),
): CronJobMetrics[] {
  const answeringReplicaSchedules = (jobs ?? []).some(
    (job) => job.schedule !== null,
  );

  return (jobs ?? []).filter((job) => {
    if (answeringReplicaSchedules && job.schedule === null) return false;
    if (job.stale_running > 0) return true;
    if (job.last_status === "FAILED") return true;

    const lastSuccess = job.last_succeeded_at
      ? new Date(job.last_succeeded_at).getTime()
      : null;

    return (
      lastSuccess === null ||
      now.getTime() - lastSuccess > CRON_SUCCESS_MAX_AGE_MS
    );
  });
}

/**
 * A provider channel worth a look (contract §32): a fifth of its calls failing
 * in the window, or a p95 past what its pipeline budget tolerates. Under five
 * calls the rate is noise and only "every call failed" counts.
 */
const PROVIDER_ERROR_RATE_WARN = 0.2;
const PROVIDER_MIN_CALLS = 5;

/** Above this the call eats most of the pipeline's 15 s per-delivery budget. */
const PROVIDER_P95_WARN_MS = 5_000;

function providerChannelStatus(channel: ProviderChannelMetrics): Status {
  if (channel.calls === 0 || channel.error_rate === null) {
    return { label: "Sem chamadas", tone: "green" };
  }

  const failing =
    channel.calls >= PROVIDER_MIN_CALLS
      ? channel.error_rate >= PROVIDER_ERROR_RATE_WARN
      : channel.errors === channel.calls;

  if (failing) return { label: "Falhando", tone: "red" };

  if (
    (channel.latency_p95_ms ?? 0) >= PROVIDER_P95_WARN_MS ||
    channel.errors > 0
  ) {
    return { label: "Atenção", tone: "yellow" };
  }

  return { label: "Normal", tone: "green" };
}

/** A card's badge from its rows: the first red, else the first yellow, else "Normal". */
function worstStatus(statuses: Status[]): Status | null {
  if (statuses.length === 0) return null;

  return (
    statuses.find((status) => status.tone === "red") ??
    statuses.find((status) => status.tone === "yellow") ?? {
      label: "Normal",
      tone: "green",
    }
  );
}

/** Redis: down is red; evicting keys, refusing connections, near the ceiling or slow is yellow. */
function redisStatus(redis: RedisMetrics | undefined): Status | null {
  if (!redis) return null;
  if (redis.status === "down") return { label: "Fora do ar", tone: "red" };

  if ((redis.evicted_keys ?? 0) > 0 || (redis.rejected_connections ?? 0) > 0) {
    return { label: "Atenção", tone: "yellow" };
  }

  if (
    redis.maxmemory_mb !== null &&
    redis.used_memory_mb !== null &&
    redis.used_memory_mb / redis.maxmemory_mb >= 0.8
  ) {
    return { label: "Memória alta", tone: "yellow" };
  }

  if ((redis.latency_ms ?? 0) >= 100) return { label: "Lento", tone: "yellow" };

  return { label: "Saudável", tone: "green" };
}

const READINESS_LABEL: Record<ProviderReadinessStatus, string> = {
  ok: "Pronto",
  warning: "Atenção",
  error: "Com erro",
  not_configured: "Não configurado",
  disabled: "Desligado",
};

/**
 * One provider's badge. "Não configurado" is red: an unset provider fails
 * every send of its channel. "Desligado" is deliberate (AI_PROVIDER=none,
 * e-mail outside production) and stays neutral.
 */
function readinessBadge(status: ProviderReadinessStatus): Status {
  const tone: Tone =
    status === "ok" || status === "disabled"
      ? "green"
      : status === "warning"
        ? "yellow"
        : "red";

  return { label: READINESS_LABEL[status] ?? status, tone };
}

/** The card's badge: the worst provider wins. */
function readinessSummary(
  providers: ProviderReadiness[] | undefined,
): Status | null {
  if (!providers || providers.length === 0) return null;

  const broken = providers.filter(
    (provider) =>
      provider.status === "error" || provider.status === "not_configured",
  ).length;

  if (broken > 0) {
    return { label: `${broken} com problema`, tone: "red" };
  }

  if (providers.some((provider) => provider.status === "warning")) {
    return { label: "Com ressalvas", tone: "yellow" };
  }

  return { label: "Todos prontos", tone: "green" };
}

/** "45s", "12 min", "3 h" — or "—" when there is nothing to measure. */
function formatAge(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;

  return `${Math.round(seconds / 3600)} h`;
}

const TONE_BADGE_CLASS: Record<Tone, string> = {
  green: "bg-green-100 text-green-800 border-green-200",
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
  red: "bg-red-100 text-red-800 border-red-200",
};

export {
  TONE_BADGE_CLASS,
  providerChannelStatus,
  readinessBadge,
  readinessSummary,
  redisStatus,
  worstStatus,
  channelWarnings,
  cronAlerts,
  formatAge,
  poolStatus,
  queueStatus,
  stuckWorkers,
  whatsappAfterAcceptance,
};
export type { Status, Tone };
