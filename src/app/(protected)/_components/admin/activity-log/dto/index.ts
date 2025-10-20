interface ActivityProps {
  id: string;
  type: string;
  action: string;
  entityId: string;
  description: string;
  status: string;
  performedBy: string;
  businessId: string | null;
  userEmail: string;
  userName: string;
  userRole: string;
  business_name?: string; // Only for MASTER
  created_at: string;
  updated_at: string;
}

interface ActivityLogProps {
  initialData: ActivityProps[];
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

export type { ActivityProps, ActivityLogProps };
