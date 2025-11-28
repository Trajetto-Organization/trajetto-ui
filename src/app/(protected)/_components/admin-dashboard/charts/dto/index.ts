import { DashboardData } from "../../dto";

interface ChartsProps {
  dashboardData: DashboardData;
  userRole?: string;
}

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

interface MaintenanceCost {
  month?: string;
  date?: string;
  preventive: number;
  corrective: number;
}

interface ChartBarDefaultProps {
  maintenanceCosts: MaintenanceCost[];
}

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

export type {
  ChartsProps,
  TrendsData,
  ChartBarDefaultProps,
  ChartAreaInteractiveProps,
  ActivityTrend,
};
