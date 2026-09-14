interface VehicleChecklistProps {
  id: string;
  current_mileage: number;
  checklist_date: Date | string;
  tires_condition: string;
  headlights_working: boolean;
  taillights_working: boolean;
  turn_signals_working: boolean;
  bumpers_condition: string;
  windshield_condition: string;
  mirrors_condition: string;
  seatbelts_working: boolean;
  dashboard_working: boolean;
  steering_wheel_condition: string;
  brakes_working: boolean;
  clutch_working: boolean;
  fuel_level_adequate: boolean;
  oil_level_adequate: boolean;
  radiator_water_adequate: boolean;
  brake_fluid_adequate: boolean;
  battery_condition: string;
  driver_license_valid: boolean;
  vehicle_documents_valid: boolean;
  insurance_valid: boolean;
  fire_extinguisher_valid: boolean;
  warning_triangle_present: boolean;
  jack_present: boolean;
  spare_tire_condition: string;
  notes?: string | null;
  photos?: string[];
  overall_condition: string;
  businessId: string;
  branchId: string;
  vehicleId: string;
  driverId: string;
  business?: {
    corporate_reason: string;
    fantasy_name: string | null;
  };
  branch: {
    corporate_reason: string;
    fantasy_name: string | null;
  };
  vehicle: {
    description: string;
    license_plate: string;
    brand: string;
    model: string;
    current_mileage: number;
  };
  driver: {
    name: string;
    cnh: string;
  };
  created_at: Date | string;
  updated_at: Date | string;
}

export type { VehicleChecklistProps };
