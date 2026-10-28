import { relayUrl } from "@/lib/api-relay-paths";
import { RelayReadError, readQuery, relayJson } from "@/lib/relay-read";

import type { RouteMonitoringData } from "@/actions/control-tower/types";
import {
  TowerRequestError,
  isPermanentFailure,
} from "@/features/control-tower/lib/tower-request";

/**
 * The monitoring board's read, from the browser through the relay
 * (lib/relay-read).
 *
 * Server Actions until now: a board re-read on every burst of route events
 * took its turn in Next's one-at-a-time action queue, behind (or in front
 * of) every other read on the page, and a failed one held the queue through
 * its retries. A refusal still reaches the board as a TowerRequestError,
 * with the API's code and status, so the board says the same things.
 */

async function readBoard<T>(
  url: string,
  errorMessage: string,
  signal?: AbortSignal,
): Promise<T> {
  try {
    const answer = await relayJson<{ data: T }>(url, { signal, errorMessage });

    return answer.data;
  } catch (error) {
    if (error instanceof RelayReadError) {
      throw new TowerRequestError(
        error.message,
        error.code ?? undefined,
        // No answer at all reads as an outage, which is worth one retry.
        error.status ?? 503,
      );
    }

    throw error;
  }
}

async function fetchRouteMonitoring(
  {
    businessId,
    page,
    pageSize,
  }: { businessId?: string; page?: number; pageSize?: number },
  { signal }: { signal?: AbortSignal } = {},
): Promise<RouteMonitoringData> {
  return readBoard<RouteMonitoringData>(
    relayUrl("/route/monitoring", readQuery({ businessId, page, pageSize })),
    "Houve um erro ao carregar o monitoramento por rota.",
    signal,
  );
}

/**
 * react-query's `retry` for the boards: one more attempt for a transient
 * failure, none for a refusal asking again cannot fix.
 */
function retryBoardOnce(failureCount: number, error: unknown): boolean {
  return failureCount < 1 && !isPermanentFailure(error);
}

export { fetchRouteMonitoring, retryBoardOnce };
