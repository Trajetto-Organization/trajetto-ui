import { useCallback, useMemo, useState } from "react";
import { useDashboardData } from "../../hooks";

import type { ChartBarDefaultProps } from "../bar-chart.types";
import { costComparison } from "../cost-comparison";

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
      return (trendsData.maintenanceCosts ?? []).map((item) => ({
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
      // 30 civil days of the company, not the calendar month.
      case "30d":
        return "Últimos 30 dias";
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
    (sum, item) => sum + item.internal,
    0,
  );
  const totalExternal = displayCosts.reduce(
    (sum, item) => sum + item.external,
    0,
  );

  // The running point (this month, or today) against the one before it,
  // both named (cost-comparison.ts).
  const comparison = useMemo(
    () => costComparison(displayCosts),
    [displayCosts],
  );

  // Prepare data for the chart
  const chartData = useMemo(() => {
    return displayCosts.map((item) => ({
      month: item.month || item.date,
      total: item.internal + item.external,
      internal: item.internal,
      external: item.external,
    }));
  }, [displayCosts]);

  return {
    isLoadingTrends,
    handleTimeRangeChange,
    getTimeRangeLabel,
    totalInternal,
    totalExternal,
    comparison,
    chartData,
    timeRange,
  };
}

export { useBarChart };
