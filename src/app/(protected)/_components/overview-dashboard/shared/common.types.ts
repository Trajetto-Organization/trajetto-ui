interface DashboardData {
  counts: {
    vehicles: { value: number; change: number };
    drivers: { value: number; change: number };
    businesses: { value: number; change: number };
    branches: { value: number; change: number };
    parts: { value: number; change: number };
    suppliers: { value: number; change: number };
    serviceOrders: { value: number; change: number };
    users: { value: number; change: number };
    fines: { value: number; change: number };

    // Absent when the company did not hire the deliveries module, or the
    // profile may not read them. The card is skipped rather than zeroed.
    deliveries?: { value: number; change: number };
    routes?: { value: number; change: number };
  };

  /**
   * The operation right now, or null.
   *
   * Null in three distinct cases the API keeps apart — a MASTER, who has no
   * single company to summarise; a company without the module; a profile
   * without `delivery_manage`. All three mean "do not draw the block", and
   * none of them mean "everything is at zero".
   */
  deliveryOperation: {
    unassigned: number;
    designated: number;
    inRoute: number;
    deliveredToday: number;
    failedToday: number;
    occurrencesToday: number;
  } | null;
  vehicleStatus: {
    status: string;
    label: string;
    count: number;
    color: string;
  }[];
  maintenanceStats: {
    name: string;
    value: number;
    color: string;
  }[];
  /**
   * One point per month of the company's calendar. A series is absent when
   * the viewer may not see it or the company did not hire its module; the
   * chart draws no line for it.
   */
  activityTrends: {
    month: string;
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
  }[];
  recentActivity: {
    id: string;
    type: string;
    action: string;
    entityId: string;
    description: string;
    /** Any status the trail records; the activity catalog reads it. */
    status: string;
    performedBy: string;
    businessId: string | null;
    user?: {
      email: string;
      role: string;
      name: string;
    };
    business?: {
      corporate_reason: string;
    } | null;
    tenantName?: string | null;
    created_at: string | Date;
    updated_at: string | Date;
  }[];
  vehiclesByType: {
    name: string;
    value: number;
    color: string;
  }[];
  maintenanceCosts: {
    month: string;
    internal: number;
    external: number;
  }[];
}

interface OverviewDashboardProps {
  initialData: DashboardData;
  userLogged?: {
    role: string;
    name: string;
    email: string;
    profileAccess?: {
      permissions?: Array<{
        permissionKey: string;
        canRead: boolean;
        canWrite: boolean;
      }>;
    };
    /** Server-rendered fallback while the auth store has not confirmed yet. */
    enabledModules?: string[];
  };
  dashboardError?: {
    error: boolean;
    errorMessage: string;
  };
  userError?: {
    error: boolean;
    errorMessage: string;
  };
  basePath: string;
}

interface ChartsProps {
  dashboardData: DashboardData;
  userRole?: string;

  /** Maintenance charts; false for a company that did not hire Frotas. */
  showFleetCharts?: boolean;
}

export type { DashboardData, OverviewDashboardProps, ChartsProps };
