import { useState, useCallback } from "react";
import { getCookies } from "@/actions/cookies";

import { toast } from "sonner";
import type { TrendsData } from "../charts.types";

function useDashboardData() {
  const [isLoadingTrends, setIsLoadingTrends] = useState<boolean>(false);
  const [trendsData, setTrendsData] = useState<TrendsData | null>(null);

  const fetchTrendsByPeriod = useCallback(async (period: string) => {
    if (["7d", "30d"].includes(period)) {
      setIsLoadingTrends(true);

      try {
        const token = await getCookies("tkey");

        if (!token) {
          toast.error("Sessão expirada. Por favor, faça login novamente.");
          return null;
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_HTTP_REQUEST}/dashboard/trends?period=${period}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Accept-Encoding": "gzip",
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error("Falha ao buscar dados de tendências");
        }

        const data = await response.json();
        setTrendsData(data);

        return data;
      } catch (error) {
        toast.error("Erro ao carregar dados do período selecionado");
        return null;
      } finally {
        setIsLoadingTrends(false);
      }
    }

    // For periods 3m, 6m, 12m, we use the initial data from the server
    setTrendsData(null);
    return null;
  }, []);

  return {
    isLoadingTrends,
    trendsData,
    fetchTrendsByPeriod,
  };
}

export { useDashboardData };
