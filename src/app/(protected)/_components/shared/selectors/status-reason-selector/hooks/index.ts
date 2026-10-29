"use client";

import { useMemo } from "react";
import { useQuery } from "react-query";

import type { StatusChangeReasonData } from "@/actions/status-change-reason/list-status-change-reason";
import { fetchStatusChangeReasons } from "@/lib/delivery-reads";
import { CATALOG_STALE_TIME_MS } from "@/lib/query-client-props";

/**
 * The company's vocabulary for overriding a status.
 *
 * Fetched in one page rather than by cursor: this is a catalogue a dispatcher
 * maintains by hand, so it is a handful of words, not a table. Paging it would
 * be machinery around a list that fits on one screen.
 *
 * Only ACTIVE reasons are offered. A retired one keeps explaining the events
 * that already cite it and must never be offered for a new change — which is
 * precisely why the API refuses it too, so the picker and the endpoint agree
 * by construction rather than by luck.
 */
const PAGE_SIZE = 100;

interface UseStatusReasonsResult {
  reasons: StatusChangeReasonData[];
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string | null;
  refetch: () => void;
}

const useStatusReasons = (
  businessId: string,
  enabled = true,
): UseStatusReasonsResult => {
  const { data, isLoading, isError, error, refetch } = useQuery(
    ["status_change_reason", businessId],
    // A relay GET (lib/delivery-reads), beside the delivery's own read.
    ({ signal }) =>
      fetchStatusChangeReasons(businessId, 1, PAGE_SIZE, { signal }),
    {
      enabled: enabled && Boolean(businessId),

      // Short, like every picker: a reason created in /admin has to show in
      // the /dashboard dialog opened next, and five minutes did not (Entregas
      // 4). The cached list still renders at once while it refetches.
      staleTime: CATALOG_STALE_TIME_MS,
    },
  );

  const reasons = useMemo(
    () => (data?.data ?? []).filter((reason) => reason.is_active),
    [data],
  );

  return {
    reasons,
    isLoading,
    hasError: isError,
    errorMessage: error instanceof Error ? error.message : null,
    refetch: () => void refetch(),
  };
};

export { useStatusReasons, PAGE_SIZE };
export type { UseStatusReasonsResult };
