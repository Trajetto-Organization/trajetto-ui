import type { CountBasis } from "@/lib/dashboard-counts";

/** A count card; `basis` is absent in data shaped before the API sent it. */
type CountCard = { value: number; change: number; basis?: CountBasis };

interface DashboardCountData {
  vehicles: CountCard;
  drivers: CountCard;
  businesses: CountCard;
  branches: CountCard;
  parts: CountCard;
  suppliers: CountCard;
  serviceOrders: CountCard;
  users: CountCard;
  fines: CountCard;

  /**
   * Optional, and that is the contract rather than laziness: the API omits
   * them for a company that did not hire the deliveries module and for a
   * profile without `delivery_manage`. The card is skipped, not zeroed.
   */
  deliveries?: CountCard;
  routes?: CountCard;
}

export type { DashboardCountData };
