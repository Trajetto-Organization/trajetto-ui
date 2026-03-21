interface VehicleTypeProps {
  id: string;
  description: string;
  number_of_axles: number;
  businessId: string;
  created_at: Date | string;
  updated_at: Date | string;
  business?: {
    corporate_reason: string;
  } | null;
}

export type { VehicleTypeProps };
