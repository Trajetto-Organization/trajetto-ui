interface DashboardCountData {
  vehicles: { value: number; change: number };
  drivers: { value: number; change: number };
  businesses: { value: number; change: number };
  branches: { value: number; change: number };
  parts: { value: number; change: number };
  suppliers: { value: number; change: number };
  serviceOrders: { value: number; change: number };
  users: { value: number; change: number };
  fines: { value: number; change: number };
}

export type { DashboardCountData };
