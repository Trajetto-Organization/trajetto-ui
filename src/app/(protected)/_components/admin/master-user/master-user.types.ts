interface MasterUserProps {
  id: string;
  role: string;
  email: string;
  email_verified?: string | null;
  two_factor_enabled: boolean;
  access_revoked: boolean;
  name: string;
  avatar?: string | null;
  whatsapp_phone?: string | null;
  created_at: string;
  updated_at: string;
}

export type { MasterUserProps };
