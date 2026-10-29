import { useEffect, useRef, useState } from "react";
import {
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseQueryResult,
} from "react-query";

import { relayUrl } from "@/lib/api-relay-paths";
import { queryClientProps } from "@/lib/query-client-props";
import { relayJson } from "@/lib/relay-read";

import type { HealthMetricsData } from "@/actions/health/get-health-metrics";
import type { ProviderReadinessData } from "@/actions/health/get-health-providers";

import { PROVIDER_RECHECK_MS, hasTransientProvider } from "./rules";

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

/**
 * The providers' read an "Atualizar" started, per client, while it is on its
 * way. A second press joins it (a double click is one probe), and an
 * automatic re-read due meanwhile is skipped: the person's read is already
 * the fresh one.
 */
const explicitReads = new WeakMap<QueryClient, Promise<unknown>>();

/**
 * How many providers' reads "Atualizar" has started. An automatic re-read
 * remembers the count it started under, so a result is only taken as the
 * automatic one when no "Atualizar" superseded it.
 */
let explicitRefreshes = 0;

/**
 * §12: a verdict that rests on a passing condition (an attempt failed, or
 * the answer was slow) is read once more, PROVIDER_RECHECK_MS later, so a
 * blip clears from the screen by itself, and a provider that is really down
 * is confirmed instead of guessed.
 *
 * Bounded by construction: the automatic read's own result never schedules
 * another, so a provider that stays unstable costs one extra read per result
 * the user asked for (mount, "Atualizar"), never a loop. It is a plain read,
 * without refresh=true: the API's 5-second copy of a transient report has
 * expired by then, and the button's rate limit is left to the button.
 *
 * "Atualizar" outranks it. Pressed while the re-read is out, it cancels it
 * and the result that lands is the person's, judged on its own (one more
 * automatic re-read if it is transient too). Pressed before the re-read is
 * due, the re-read is skipped when its time comes.
 */
function useTransientRecheck(
  query: UseQueryResult<ProviderReadinessData>,
): boolean {
  const { data, dataUpdatedAt, refetch } = query;
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  // The `explicitRefreshes` count the automatic re-read started under, or
  // null when none is out.
  const automatic = useRef<number | null>(null);
  const refetchRef = useRef(refetch);

  refetchRef.current = refetch;

  useEffect(() => {
    if (!data) return;

    const startedUnder = automatic.current;

    if (startedUnder !== null) {
      automatic.current = null;

      // The automatic re-read's own result: never read again. Unless an
      // "Atualizar" cancelled it, and this is the person's read instead.
      if (startedUnder === explicitRefreshes) return;
    }

    if (!hasTransientProvider(data)) return;

    setPending(true);

    const timer = setTimeout(() => {
      setPending(false);

      if (explicitReads.has(queryClient)) return;

      automatic.current = explicitRefreshes;

      void refetchRef.current().then((result) => {
        // A failed read leaves the data as it was: nothing will consume
        // the flag, so the next result (the user's) is judged on its own.
        if (result.isError) automatic.current = null;
      });
    }, PROVIDER_RECHECK_MS);

    return () => {
      clearTimeout(timer);
      setPending(false);
    };
  }, [data, dataUpdatedAt, queryClient]);

  return pending;
}

function useProviderReadiness(): {
  query: UseQueryResult<ProviderReadinessData>;

  /** An automatic re-read is scheduled after a transient result. */
  recheckPending: boolean;
} {
  const query = useQuery(
    PROVIDER_READINESS_KEY,
    ({ signal }) => fetchProviderReadiness(probeProvidersAfresh, { signal }),
    SYSTEM_QUERY_OPTIONS,
  );
  const recheckPending = useTransientRecheck(query);

  return { query, recheckPending };
}

/**
 * The tab's "Atualizar": both reads again, side by side, the providers past
 * the API's cache. Nothing else on the page is asked for. A refusal stays in
 * its query (each card says why); this never rejects.
 *
 * `cancelRefetch` on the providers: a plain read already out (the automatic
 * re-read, mostly) used to be joined — react-query handed back the running
 * fetch, the queryFn never saw the flag, no refresh=true went out, and the
 * result was taken as the automatic one. Now that read is cancelled and this
 * one goes past the cache. A read this button started is joined instead, so
 * a double click is still one probe. Before the first answer react-query has
 * nothing to cancel (it only cancels a refetch of a query with data) and the
 * press joins that first read, which is the moment's own anyway.
 */
async function refreshSystemMetrics(
  queryClient: QueryClient = queryClientProps,
): Promise<void> {
  const running = explicitReads.get(queryClient);
  let providers: Promise<unknown> = running ?? Promise.resolve();
  let metrics: Promise<unknown> = Promise.resolve();

  probeProvidersAfresh = true;

  try {
    // react-query starts each fetch synchronously, so the providers' queryFn
    // has read the flag by the time it is put back.
    if (!running) {
      explicitRefreshes += 1;

      providers = queryClient.refetchQueries(
        PROVIDER_READINESS_KEY,
        { exact: true },
        { cancelRefetch: true },
      );
    }

    metrics = queryClient.refetchQueries(HEALTH_METRICS_KEY, { exact: true });
  } finally {
    probeProvidersAfresh = false;
  }

  if (!running) {
    // refetchQueries never rejects without `throwOnError`.
    const own = providers;

    explicitReads.set(queryClient, own);
    void own.then(() => {
      if (explicitReads.get(queryClient) === own)
        explicitReads.delete(queryClient);
    });
  }

  await Promise.allSettled([providers, metrics]);
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
