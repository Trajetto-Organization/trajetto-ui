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
}

interface ChartAreaInteractiveProps {
  activityTrends: ActivityTrend[];
  userRole?: string;
}

export type { ChartAreaInteractiveProps, ActivityTrend };
