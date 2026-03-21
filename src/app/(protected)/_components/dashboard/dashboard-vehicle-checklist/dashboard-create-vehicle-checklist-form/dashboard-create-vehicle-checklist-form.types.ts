import type {
  CommandBranchInputValue,
  CommandVehicleInputValue,
} from "@/app/(protected)/_components/shared/common.types";
import { Dispatch, SetStateAction } from "react";

interface DashboardCreateVehicleChecklistValidationError {
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

interface DashboardCreateVehicleChecklistFormState {
  createVehicleChecklistError?: DashboardCreateVehicleChecklistValidationError;
  successMessage?: string;
}

interface DashboardCreateVehicleChecklistSubmitProps {
  state: DashboardCreateVehicleChecklistFormState;
  onBack: () => void;
  commandBranchInputValue: CommandBranchInputValue;
  commandVehicleInputValue: CommandVehicleInputValue;
  businessId: string;
  checklistFiles: Record<string, File[]>;
  setChecklistFiles: Dispatch<SetStateAction<Record<string, File[]>>>;
  fileErrors: Record<string, string | null>;
  setFileErrors: Dispatch<SetStateAction<Record<string, string | null>>>;
  initialFormValues: Record<string, any>;
  onFormValuesChange: (values: Record<string, any>) => void;
}

export type {
  DashboardCreateVehicleChecklistFormState,
  DashboardCreateVehicleChecklistSubmitProps,
};
