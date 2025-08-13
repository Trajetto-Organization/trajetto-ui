interface UserRegistrationProps {
  id: string;
  role: string;
  email: string;
  two_factor_enabled: boolean;
  access_revoked: boolean;
  email_verified: boolean;
  name: string;
  avatar: string;
  corporate_reason?: string;
  businessId: string;
  profileAccess: string;
  profileAccessId: string;
  whatsapp_phone?: string | null;
  created_at: string;
  updated_at: string;
}

export type { UserRegistrationProps };
