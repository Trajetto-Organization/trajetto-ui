interface ActivityTrend {
  month?: string;
  date?: string;
  vehicles: number;
  drivers: number;
  businesses: number;
  branches: number;
  parts: number;
  suppliers: number;
  serviceOrders: number;
  users: number;
  fines: number;

  /**
   * Optional because the API leaves them out for a company that did not hire
   * the deliveries module. `METRICS` is filtered against the data before the
   * chart draws, so an absent key means no line rather than a line of gaps.
   */
  deliveries?: number;
  routes?: number;
}

interface ChartAreaInteractiveProps {
  activityTrends: ActivityTrend[];
  userRole?: string;
}

export type { ChartAreaInteractiveProps, ActivityTrend };
