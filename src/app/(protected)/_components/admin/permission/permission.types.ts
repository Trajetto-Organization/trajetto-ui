interface PermissionProps {
  id: string;
  action: string;
  permissionKey: string;
  canRead: boolean;
  canWrite: boolean;
  businessId: string;
  profileAccessId: string;
  profileAccess: {
    name: string;
  };
  business?: {
    id: string;
    corporate_reason: string;
  };
  created_at: string;
  updated_at: string;
}

export type { PermissionProps };
