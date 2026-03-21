interface VehicleData {
  current_mileage: number;
  maintenance_interval_km: number;
  last_maintenance_mileage?: number | null;
  km_per_liter: number;
  license_plate?: string;
  description?: string;
  last_fuel_mileage?: number | null;
  last_fuel_date?: string | null;
}

interface FetchVehicleDataProps {
  vehicleId: string;
  businessId: string;
}

interface UseFetchVehicleDataProps {
  vehicleId: string;
  businessId: string;
}

export type { VehicleData, FetchVehicleDataProps, UseFetchVehicleDataProps };
