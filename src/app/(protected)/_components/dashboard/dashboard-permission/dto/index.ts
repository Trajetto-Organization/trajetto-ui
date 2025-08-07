interface DashboardPermissionProps {
  id: string;
  action: string;
  permission: string;
  canRead: boolean;
  canWrite: boolean;
  businessId: string;
  profileAccessId: string;
  profile_name: string;
  created_at: string;
  updated_at: string;
}

export type { DashboardPermissionProps };
