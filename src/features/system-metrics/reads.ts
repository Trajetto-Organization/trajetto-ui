import { useQuery, type QueryClient } from "react-query";

import { relayUrl } from "@/lib/api-relay-paths";
import { queryClientProps } from "@/lib/query-client-props";
import { relayJson } from "@/lib/relay-read";

import type { HealthMetricsData } from "@/actions/health/get-health-metrics";
import type { ProviderReadinessData } from "@/actions/health/get-health-providers";

/**
 * The Sistema tab's two reads, from the browser through the relay.
 *
 * They were Server Actions, and Next 14 runs those one at a time: the
 * providers' probes (which can take seconds) went first and the metrics
 * waited behind them. As relay GETs in react-query they leave together, and
 * the tab's "Atualizar" refetches exactly these two instead of re-rendering
 * the whole /admin page.
 */
const HEALTH_METRICS_KEY = ["system-metrics", "metrics"] as const;
const PROVIDER_READINESS_KEY = ["system-metrics", "providers"] as const;

async function fetchHealthMetrics({
  signal,
}: { signal?: AbortSignal } = {}): Promise<HealthMetricsData> {
  return relayJson<HealthMetricsData>(relayUrl("/health/metrics"), {
    signal,
    errorMessage: "Houve um erro ao obter as métricas do sistema.",
  });
}

/**
 * `refresh` skips the API's 30-second cache. The probes call Resend, Meta,
 * Expo, R2 and the OCR service, so only the explicit "Atualizar" asks for it.
 */
async function fetchProviderReadiness(
  refresh: boolean,
  { signal }: { signal?: AbortSignal } = {},
): Promise<ProviderReadinessData> {
  return relayJson<ProviderReadinessData>(
    relayUrl("/health/providers", refresh ? "refresh=true" : undefined),
    {
      signal,
      errorMessage: "Houve um erro ao verificar os provedores externos.",
    },
  );
}

/** On demand and without history: every mount reads the moment. */
const SYSTEM_QUERY_OPTIONS = {
  staleTime: 0,
  refetchOnWindowFocus: false,
} as const;

function useHealthMetrics() {
  return useQuery(
    HEALTH_METRICS_KEY,
    ({ signal }) => fetchHealthMetrics({ signal }),
    SYSTEM_QUERY_OPTIONS,
  );
}

/**
 * True only while the tab's "Atualizar" starts its refetch: the one read
 * that goes past the API's cache. A flag rather than a second queryFn, so
 * whatever else refetches the key later (a resync) still reads the cache.
 */
let probeProvidersAfresh = false;

function useProviderReadiness() {
  return useQuery(
    PROVIDER_READINESS_KEY,
    ({ signal }) => fetchProviderReadiness(probeProvidersAfresh, { signal }),
    SYSTEM_QUERY_OPTIONS,
  );
}

/**
 * The tab's "Atualizar": both reads again, side by side, the providers past
 * the API's cache. Nothing else on the page is asked for. A refusal stays in
 * its query (each card says why); this never rejects.
 */
async function refreshSystemMetrics(
  queryClient: QueryClient = queryClientProps,
): Promise<void> {
  let pending: Promise<unknown>[] = [];

  probeProvidersAfresh = true;

  try {
    // react-query starts each fetch synchronously, so the providers' queryFn
    // has read the flag by the time it is put back.
    pending = [
      queryClient.refetchQueries(PROVIDER_READINESS_KEY, { exact: true }),
      queryClient.refetchQueries(HEALTH_METRICS_KEY, { exact: true }),
    ];
  } finally {
    probeProvidersAfresh = false;
  }

  await Promise.allSettled(pending);
}

export {
  HEALTH_METRICS_KEY,
  PROVIDER_READINESS_KEY,
  fetchHealthMetrics,
  fetchProviderReadiness,
  useHealthMetrics,
  useProviderReadiness,
  refreshSystemMetrics,
};
