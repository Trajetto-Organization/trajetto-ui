interface ProfileAccessProps {
  id: string;
  name: string;
  businessId?: string;
  business?: {
    corporate_reason: string;
  };
  created_at: string;
  updated_at: string;
}

export type { ProfileAccessProps };
