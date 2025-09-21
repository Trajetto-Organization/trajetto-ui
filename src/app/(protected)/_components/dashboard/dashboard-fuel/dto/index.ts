interface DashboardFuelProps {
  id: string;
  current_mileage: number;
  liters_amount: string;
  price_per_liter: string;
  total_amount: string;
  odometer_photo: string;
  odometer_verified: boolean;
  notes?: string | null;
  refueling_date: string;
  businessId?: string;
  branchId: string;
  vehicleId: string;
  driverId: string;
  fuelTypeId: string;
  vehicle_license_plate?: string | null;
  vehicle_description?: string | null;
  vehicle_brand?: string | null;
  vehicle_model?: string | null;
  driver_name?: string | null;
  driver_cnh?: string | null;
  branch_name: string;
  business_name?: string;
  fuel_type_description?: string | null;
  created_at: string;
  updated_at: string;
}

export type { DashboardFuelProps };
