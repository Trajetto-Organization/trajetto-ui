import { useCallback, useMemo, useState } from "react";
import { useDashboardData } from "../../hooks";

import type { ChartBarDefaultProps } from "../bar-chart.types";

function useBarChart({ maintenanceCosts }: ChartBarDefaultProps) {
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
  const displayCosts = useMemo(() => {
    // If we have trends data for daily periods, use it
    if (trendsData && ["7d", "30d"].includes(timeRange)) {
      return trendsData.maintenanceCosts.map((item) => ({
        ...item,
        month: item.date, // Map date to month for consistency
      }));
    }

    // Otherwise, filter the initial monthly data
    const dataLength = maintenanceCosts.length;
    switch (timeRange) {
      case "3m":
        return maintenanceCosts.slice(-Math.min(3, dataLength));
      case "6m":
        return maintenanceCosts.slice(-Math.min(6, dataLength));
      case "12m":
        return maintenanceCosts.slice(-Math.min(12, dataLength));
      default:
        return maintenanceCosts.slice(-Math.min(6, dataLength));
    }
  }, [maintenanceCosts, timeRange, trendsData]);

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

  // Calculate totals for footer based on filtered data
  const totalInternal = displayCosts.reduce(
    (sum, item) => sum + item.preventive,
    0,
  );
  const totalExternal = displayCosts.reduce(
    (sum, item) => sum + item.corrective,
    0,
  );

  // Calculate growth percentage (compare last 2 periods if available)
  const growthPercentage = useMemo(() => {
    if (displayCosts.length < 2) return 0;

    const currentPeriod = displayCosts[displayCosts.length - 1];
    const previousPeriod = displayCosts[displayCosts.length - 2];

    const currentTotal = currentPeriod.preventive + currentPeriod.corrective;
    const previousTotal = previousPeriod.preventive + previousPeriod.corrective;

    if (previousTotal === 0) return 0;

    return Math.round(((currentTotal - previousTotal) / previousTotal) * 100);
  }, [displayCosts]);

  // Prepare data for the chart
  const chartData = useMemo(() => {
    return displayCosts.map((item) => ({
      month: item.month || item.date,
      total: item.preventive + item.corrective,
      preventive: item.preventive,
      corrective: item.corrective,
    }));
  }, [displayCosts]);

  return {
    isLoadingTrends,
    handleTimeRangeChange,
    getTimeRangeLabel,
    totalInternal,
    totalExternal,
    growthPercentage,
    chartData,
    timeRange,
  };
}

export { useBarChart };
