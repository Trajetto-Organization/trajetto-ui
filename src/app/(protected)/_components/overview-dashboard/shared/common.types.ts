type StatusBadgeProps =
  | "Completo"
  | "Criado"
  | "Ativo"
  | "Atualizado"
  | "Deletado"
  | "Bloqueado"
  | "Pendente"
  | "Em Rota"
  | "Inativo";

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
  };
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
  activityTrends: {
    month: string;
    vehicles: number;
    drivers: number;
    businesses: number;
    branches: number;
    parts: number;
    suppliers: number;
    serviceOrders: number;
    users: number;
    fines: number;
  }[];
  recentActivity: {
    id: string;
    type: string;
    action: string;
    entityId: string;
    description: string;
    status: StatusBadgeProps;
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
    preventive: number;
    corrective: number;
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
}

export type {
  DashboardData,
  StatusBadgeProps,
  OverviewDashboardProps,
  ChartsProps,
};
