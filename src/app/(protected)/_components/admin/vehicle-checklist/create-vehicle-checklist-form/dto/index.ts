import {
  CommandBranchInputValue,
  CommandBusinessInputValue,
  CommandVehicleInputValue,
} from "@/app/(protected)/_components/dto";

interface CreateVehicleChecklistValidationError {
  current_mileage?: string[];
  checklist_date?: string[];
  tires_condition?: string[];
  headlights_working?: string[];
  taillights_working?: string[];
  turn_signals_working?: string[];
  bumpers_condition?: string[];
  windshield_condition?: string[];
  mirrors_condition?: string[];
  seatbelts_working?: string[];
  dashboard_working?: string[];
  steering_wheel_condition?: string[];
  brakes_working?: string[];
  clutch_working?: string[];
  fuel_level_adequate?: string[];
  oil_level_adequate?: string[];
  radiator_water_adequate?: string[];
  brake_fluid_adequate?: string[];
  battery_condition?: string[];
  driver_license_valid?: string[];
  vehicle_documents_valid?: string[];
  insurance_valid?: string[];
  fire_extinguisher_valid?: string[];
  warning_triangle_present?: string[];
  jack_present?: string[];
  spare_tire_condition?: string[];
  notes?: string[];
  overall_condition?: string[];
  vehicleId?: string[];
  driverId?: string[];
  branchId?: string[];
  businessId?: string[];
  // Photo fields
  odometer_photo?: string[];
  fuel_level_photo?: string[];
  tires_photo?: string[];
  createVehicleChecklistErrorMessage?: string;
}

interface CreateVehicleChecklistFormState {
  createVehicleChecklistError?: CreateVehicleChecklistValidationError;
  successMessage?: string;
}

interface CreateVehicleChecklistFormSubmitProps {
  state: CreateVehicleChecklistFormState;
  onBack: () => void;
  commandVehicleInputValue: CommandVehicleInputValue;
  commandBusinessInputValue: CommandBusinessInputValue;
  commandBranchInputValue: CommandBranchInputValue;
  checklistFiles: Record<string, File[]>;
  setChecklistFiles: React.Dispatch<
    React.SetStateAction<Record<string, File[]>>
  >;
  fileErrors: Record<string, string | null>;
  setFileErrors: React.Dispatch<
    React.SetStateAction<Record<string, string | null>>
  >;
}

export type {
  CreateVehicleChecklistFormState,
  CreateVehicleChecklistFormSubmitProps,
};
