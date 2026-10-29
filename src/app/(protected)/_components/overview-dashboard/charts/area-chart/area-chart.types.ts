/**
 * One point of the trend. Every series is optional: the API leaves out the
 * ones this viewer may not see and the ones whose module the company did not
 * hire (DLVP-ADM-1). `METRICS` is filtered against the data before the chart
 * draws, so an absent key means no line rather than a flat one.
 */
interface ActivityTrend {
  month?: string;
  date?: string;
  vehicles?: number;
  drivers?: number;
  businesses?: number;
  branches?: number;
  parts?: number;
  suppliers?: number;
  serviceOrders?: number;
  users?: number;
  fines?: number;
  deliveries?: number;
  routes?: number;
}

interface ChartAreaInteractiveProps {
  activityTrends: ActivityTrend[];
  userRole?: string;
}

export type { ChartAreaInteractiveProps, ActivityTrend };
