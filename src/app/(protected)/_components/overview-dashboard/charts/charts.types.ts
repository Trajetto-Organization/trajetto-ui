interface TrendsData {
  activityTrends: Array<{
    date: string;
    vehicles: number;
    drivers: number;
    businesses: number;
    branches: number;
    parts: number;
    suppliers: number;
    serviceOrders: number;
    users: number;
  }>;
  maintenanceCosts: Array<{
    date: string;
    preventive: number;
    corrective: number;
  }>;
}

export type { TrendsData };
