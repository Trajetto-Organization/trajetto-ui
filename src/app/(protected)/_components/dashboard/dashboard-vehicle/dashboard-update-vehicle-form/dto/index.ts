import { DashboardVehicleProps } from "../../dto";

interface DashboardUpdateVehicleValidationError {
  description?: string[];
  license_plate?: string[];
  brand?: string[];
  model?: string[];
  acquisition_date?: string[];
  fleet_type?: string[];
  fleet_id?: string[];
  last_maintenance_date?: string[];
  current_mileage?: string[];
  last_maintenance_mileage?: string[];
  maintenance_interval_km?: string[];
  maintenance_interval_months?: string[];
  renavam?: string[];
  manufacturing_year?: string[];
  model_year?: string[];
  km_per_liter?: string[];
  number_of_axles?: string[];
  status?: string[];
  businessId?: string[];
  branchId?: string[];
  vehicleTypeId?: string[];
  fuelTypeId?: string[];
  driverId?: string[];
  updateVehicleErrorMessage?: string;
}

interface DashboardUpdateVehicleFormState {
  updateVehicleError?: DashboardUpdateVehicleValidationError;
  successMessage?: string;
}

interface DashboardUpdateVehicleFormSubmitProps {
  state: DashboardUpdateVehicleFormState;
  onBack: () => void;
  vehicleData: DashboardVehicleProps;
  isBranchDirty: boolean;
  initialFormValues: Record<string, string>;
  onFormValuesChange: (values: Record<string, string>) => void;
}

interface DashboardUpdateVehicleFormProps {
  vehicleData: DashboardVehicleProps;
  handleCloseUpdateVehicle: () => void;
  isUpdateVehicleOpen: boolean;
}

export type {
  DashboardUpdateVehicleFormState,
  DashboardUpdateVehicleFormProps,
  DashboardUpdateVehicleFormSubmitProps,
};
