import { useCallback, useState } from "react";
import { useQuery } from "react-query";
import { toast } from "sonner";

import { relayUrl } from "@/lib/api-relay-paths";

import type { TrendsData } from "../charts.types";

/** The periods read day by day; the monthly ones come with the page. */
const DAILY_PERIODS = ["7d", "30d"];

const fetchTrends = async (period: string): Promise<TrendsData> => {
  const response = await fetch(
    relayUrl("/dashboard/trends", new URLSearchParams({ period })),
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Accept-Encoding": "gzip",
      },
    },
  );

  // With a status, so the client's retry policy gives up on a 4xx at once.
  if (response.status === 401) {
    throw Object.assign(
      new Error("Sessão expirada. Por favor, faça login novamente."),
      { status: 401 },
    );
  }

  if (!response.ok) {
    throw Object.assign(new Error("Falha ao buscar dados de tendências"), {
      status: response.status,
    });
  }

  return response.json();
};

/**
 * The 7/30-day series of the overview charts.
 *
 * In react-query rather than component state so the page's Atualizar reaches
 * it: the button refetches every query on screen, and state it cannot see
 * stayed as it was when the period was first picked (REV-18).
 */
function useDashboardData() {
  const [period, setPeriod] = useState<string | null>(null);

  const isDaily = period !== null && DAILY_PERIODS.includes(period);

  const { data, isLoading, isPreviousData } = useQuery(
    ["dashboard_trends", period],
    () => fetchTrends(period as string),
    {
      enabled: isDaily,
      refetchOnWindowFocus: false,

      // Toggling back to a period shows the last answer at once and
      // refreshes it, as the old fetch-on-every-toggle did.
      staleTime: 0,
      keepPreviousData: true,
      onError: (error) => {
        // Both charts observe this query; one toast, not one per chart.
        toast.error(
          error instanceof Error && error.message.startsWith("Sessão")
            ? error.message
            : "Erro ao carregar dados do período selecionado",
          { id: "dashboard-trends-error" },
        );
      },
    },
  );

  const fetchTrendsByPeriod = useCallback(async (next: string) => {
    setPeriod(next);
  }, []);

  return {
    // Only while a period is being loaded, not on a background refresh.
    isLoadingTrends: isDaily && (isLoading || isPreviousData),
    trendsData: isDaily && !isPreviousData ? (data ?? null) : null,
    fetchTrendsByPeriod,
  };
}

export { useDashboardData };
