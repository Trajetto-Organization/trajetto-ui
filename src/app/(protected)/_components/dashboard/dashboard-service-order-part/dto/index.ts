interface DashboardServiceOrderPartProps {
  id: string;
  unit_price: string | number;
  quantity: number;
  discount_percentage?: string | number | null;
  businessId: string;
  serviceOrderId: string;
  partId: string;
  created_at: Date | string;
  updated_at: Date | string;
  part: {
    id: string;
    description: string;
    unit_price: string | number;
    businessId: string;
    supplierId: string | null;
    created_at: Date | string;
    updated_at: Date | string;
  };
  business?: {
    corporate_reason: string;
  } | null;
  serviceOrder: {
    id: string;
    date: Date | string;
    vehicle: {
      license_plate: string;
      description: string;
    };
  };
}

export type { DashboardServiceOrderPartProps };
