interface DashboardServiceOrderProps {
  id: string;
  date: Date | string;
  completion_date: Date | string | null;
  maintenance_type: "INTERNAL" | "EXTERNAL";
  total_amount: number | string;
  description?: string | null;
  current_mileage_at_service: number | null;
  maintenance_interval_km_at_service: number | null;
  last_maintenance_mileage_at_service: number | null;
  new_mileage_after_service: number | null;
  businessId: string;
  vehicleId: string;
  responsibleUserId: string;
  branchId: string;
  supplierId: string | null;
  latitude: number | null;
  longitude: number | null;
  latitude_original: number | null;
  longitude_original: number | null;
  location_source: string | null;
  location_edited_by: string | null;
  location_edited_at: Date | string | null;
  created_from: "WEB" | "MOBILE" | "WEB_DASHBOARD";
  created_at: Date | string;
  updated_at: Date | string;
  vehicle?: {
    license_plate: string;
    description: string;
  };
  responsibleUser?: {
    name: string;
    email: string;
  };
  branch?: {
    corporate_reason: string;
    fantasy_name: string;
  };
  supplier?: {
    name: string;
  } | null;
  parts?: Array<{
    id: string;
    quantity: number;
    unit_price: number | string;
    serviceOrderId: string;
    partId: string;
    part: {
      id: string;
      description: string;
    };
  }>;
}

export type { DashboardServiceOrderProps };
