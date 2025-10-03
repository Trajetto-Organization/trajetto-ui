interface DashboardUserRegistrationProps {
  id: string;
  role: string;
  email: string;
  two_factor_enabled: boolean;
  access_revoked: boolean;
  email_verified: boolean;
  name: string;
  avatar: string;
  businessId: string;
  profileAccess: string;
  profileAccessId: string;
  driverId?: string;
  driverName?: string;
  whatsapp_phone?: string | null;
  created_at: string;
  updated_at: string;
}

export type { DashboardUserRegistrationProps };
