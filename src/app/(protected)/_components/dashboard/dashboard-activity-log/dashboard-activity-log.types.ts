interface DashboardActivityProps {
  id: string;
  type: string;
  action: string;
  entityId: string;
  description: string;
  status: string;
  performedBy: string;
  businessId: string | null;
  user?: {
    email: string;
    role: string;
    name: string;
  };
  created_at: string | Date;
  updated_at: string | Date;
}

interface DashboardActivityLogProps {
  initialData: DashboardActivityProps[];
  initialMeta: {
    total: number;
    page: number;
    pageSize: number;
  };
  error?: {
    error: boolean;
    errorMessage: string;
  };
  userLogged?: {
    role: string;
    name: string;
    email: string;
  };
  basePath: string;
}

export type { DashboardActivityProps, DashboardActivityLogProps };
