interface DashboardVehicleProps {
  id: string;
  description: string;
  license_plate: string;
  brand: string;
  model: string;
  acquisition_date: string;
  fleet_type: "OWNED" | "THIRD_PARTY";
  fleet_id?: string;
  last_maintenance_date: string;
  current_mileage: number;
  last_maintenance_mileage: number;
  maintenance_interval_km: number;
  maintenance_interval_months: number;
  renavam: string;
  manufacturing_year: string;
  model_year: string;
  km_per_liter: number;
  number_of_axles: number;
  status: "ACTIVE" | "INACTIVE" | "BLOCKED" | "IN_ROUTE";
  vehicleTypeId?: string;
  vehicleTypeDescription: string;
  fuelTypeId: string;
  fuelTypeDescription: string;
  driverId?: string;
  driverName: string;
  driverCnh: string;
  branchId?: string;
  branchName: string;
  businessId?: string;
  business_name?: string;
  created_at: string;
  updated_at: string;
}

export type { DashboardVehicleProps };
