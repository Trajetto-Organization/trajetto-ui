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

  /**
   * Optional, and that is the contract rather than laziness: the API omits
   * them for a company that did not hire the deliveries module and for a
   * profile without `delivery_manage`. The card is skipped, not zeroed.
   */
  deliveries?: { value: number; change: number };
  routes?: { value: number; change: number };
}

export type { DashboardCountData };
