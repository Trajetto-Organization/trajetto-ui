interface VehicleProps {
  id: string;
  description: string;
  license_plate: string;
  brand: string;
  model: string;
  acquisition_date: Date | string;
  fleet_type: "OWNED" | "THIRD_PARTY";
  fleet_id: string | null;
  last_maintenance_date: Date | string | null;
  current_mileage: number;
  last_maintenance_mileage: number | null;
  maintenance_interval_km: number;
  maintenance_interval_months: number;
  renavam: string;
  manufacturing_year: number | string;
  model_year: number | string;
  km_per_liter: number;
  number_of_axles: number;
  status: "ACTIVE" | "INACTIVE" | "BLOCKED" | "IN_ROUTE";
  vehicleTypeId: string | null;
  fuelTypeId: string;
  driverId: string | null;
  branchId: string | null;
  businessId: string;
  last_fuel_mileage?: number | null;
  last_fuel_date?: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  vehicleType?: {
    description: string;
  } | null;
  fuelType?: {
    description: string;
  };
  driver?: {
    name: string;
    cnh: string;
  } | null;
  branch?: {
    corporate_reason: string;
  } | null;
  business?: {
    corporate_reason: string;
  } | null;
}

export type { VehicleProps };
