import {
  CommandBranchInputValue,
  CommandBusinessInputValue,
  CommandDriverInputValue,
  CommandVehicleInputValue,
} from "@/app/(protected)/_components/dto";
import { VehicleChecklistProps } from "../../dto";

interface UpdateVehicleChecklistValidationError {
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
  updateVehicleChecklistErrorMessage?: string;
}

interface UpdateVehicleChecklistFormState {
  updateVehicleChecklistError?: UpdateVehicleChecklistValidationError;
  successMessage?: string;
}

interface UpdateVehicleChecklistFormSubmitProps {
  state: UpdateVehicleChecklistFormState;
  onBack: () => void;
  checklistData: VehicleChecklistProps;
  isBusinessAndEntityDirty: boolean;
  isUpdateChecklistOpen: boolean;
  commandVehicleInputValue: CommandVehicleInputValue;
  commandBusinessInputValue: CommandBusinessInputValue;
  commandBranchInputValue: CommandBranchInputValue;
  commandDriverInputValue: CommandDriverInputValue;
  checklistFiles: Record<string, File[]>;
  setChecklistFiles: React.Dispatch<
    React.SetStateAction<Record<string, File[]>>
  >;
  fileErrors: Record<string, string | null>;
  setFileErrors: React.Dispatch<
    React.SetStateAction<Record<string, string | null>>
  >;
  photosToRemove: string[];
  setPhotosToRemove: React.Dispatch<React.SetStateAction<string[]>>;
}

interface UpdateVehicleChecklistFormProps {
  checklistData: VehicleChecklistProps;
  handleCloseUpdateChecklist: () => void;
  isUpdateChecklistOpen: boolean;
}

export type {
  UpdateVehicleChecklistFormState,
  UpdateVehicleChecklistFormSubmitProps,
  UpdateVehicleChecklistFormProps,
};
