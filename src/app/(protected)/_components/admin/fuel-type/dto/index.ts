interface FuelTypeProps {
  id: string;
  description: string;
  businessId: string;
  created_at: Date | string;
  updated_at: Date | string;
  business?: {
    corporate_reason: string;
  } | null;
}

export type { FuelTypeProps };
