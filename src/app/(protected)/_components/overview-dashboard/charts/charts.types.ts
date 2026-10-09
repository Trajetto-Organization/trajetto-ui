import type { ActivityTrend } from "./area-chart/area-chart.types";

/** The 7/30-day answer of /dashboard/trends: series as in ActivityTrend. */
interface TrendsData {
  activityTrends: Array<ActivityTrend & { date: string }>;
  maintenanceCosts: Array<{
    date: string;
    internal: number;
    external: number;
  }>;
}

export type { TrendsData };
