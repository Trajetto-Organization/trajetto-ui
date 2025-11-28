import { useCallback, useMemo, useState } from "react";
import { useDashboardData } from "../../hooks";

import { ChartAreaInteractiveProps } from "../../dto";

function useChartArea({ activityTrends }: ChartAreaInteractiveProps) {
  const [timeRange, setTimeRange] = useState<string>("6m");
  const { isLoadingTrends, trendsData, fetchTrendsByPeriod } =
    useDashboardData();

  // Handle time range change
  const handleTimeRangeChange = useCallback(
    async (newRange: string) => {
      setTimeRange(newRange);

      // Fetch new data for daily periods
      if (["7d", "30d"].includes(newRange)) {
        await fetchTrendsByPeriod(newRange);
      }
    },
    [fetchTrendsByPeriod],
  );

  // Determine which data to use
  const displayData = useMemo(() => {
    // If we have trends data for daily periods, use it
    if (trendsData && ["7d", "30d"].includes(timeRange)) {
      return trendsData.activityTrends.map((item) => ({
        ...item,
        month: item.date, // Map date to month for consistency
      }));
    }

    // Otherwise, filter the initial monthly data
    const dataLength = activityTrends.length;
    switch (timeRange) {
      case "3m":
        return activityTrends.slice(-Math.min(3, dataLength));
      case "6m":
        return activityTrends.slice(-Math.min(6, dataLength));
      case "12m":
        return activityTrends.slice(-Math.min(12, dataLength));
      default:
        return activityTrends.slice(-Math.min(6, dataLength));
    }
  }, [activityTrends, timeRange, trendsData]);

  // Determine the title based on period
  const getTimeRangeLabel = (range: string) => {
    switch (range) {
      case "7d":
        return "Últimos 7 dias";
      case "30d":
        return "Último mês";
      case "3m":
        return "Últimos 3 meses";
      case "6m":
        return "Últimos 6 meses";
      default:
        return "Últimos 6 meses";
    }
  };

  return {
    isLoadingTrends,
    handleTimeRangeChange,
    displayData,
    getTimeRangeLabel,
    timeRange,
  };
}

export { useChartArea };
