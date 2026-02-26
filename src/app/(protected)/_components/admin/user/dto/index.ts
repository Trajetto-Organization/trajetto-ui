interface UserRegistrationProps {
  id: string;
  role: string;
  email: string;
  email_verified?: string | null;
  two_factor_enabled: boolean;
  access_revoked: boolean;
  name: string;
  avatar?: string | null;
  business?: {
    corporate_reason: string;
  };
  businessId?: string | null;
  profileAccessId?: string | null;
  profileAccess?: {
    name: string;
  } | null;
  driverId?: string | null;
  driver?: {
    name: string;
  } | null;
  whatsapp_phone?: string | null;
  created_at: string;
  updated_at: string;
}

export type { UserRegistrationProps };
