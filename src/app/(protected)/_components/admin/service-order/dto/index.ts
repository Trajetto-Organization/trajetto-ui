interface ServiceOrderProps {
  id: string;
  date: string;
  completion_date?: string | null;
  maintenance_type: "INTERNAL" | "EXTERNAL";
  total_amount: string;
  current_mileage_at_service?: number | null;
  maintenance_interval_km_at_service?: number | null;
  last_maintenance_mileage_at_service?: number | null;
  new_mileage_after_service?: number | null;
  businessId?: string;
  vehicleId: string;
  responsibleUserId: string;
  branchId: string;
  supplierId?: string | null;
  vehicleLicensePlate?: string | null;
  vehicleDescription?: string | null;
  responsibleUserName?: string | null;
  responsibleUserEmail?: string | null;
  branchName: string;
  business_name?: string;
  supplierName?: string | null;
  partsCount?: number | null;
  // 📍 GEOLOCATION
  latitude?: number | null;
  longitude?: number | null;
  created_at: string;
  updated_at: string;
}

export type { ServiceOrderProps };
