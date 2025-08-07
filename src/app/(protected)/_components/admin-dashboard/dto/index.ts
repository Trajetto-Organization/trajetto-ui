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
    description: string;
    userEmail: string;
    userName: string;
    userRole: string;
    business_name?: string;
    date: string;
    status: StatusBadgeProps;
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

export type { DashboardData, StatusBadgeProps };
