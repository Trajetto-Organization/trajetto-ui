import type { VehicleProps } from "../vehicle.types";

interface UpdateVehicleValidationError {
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

interface UpdateVehicleFormState {
  updateVehicleError?: UpdateVehicleValidationError;
  successMessage?: string;
}

interface UpdateVehicleFormSubmitProps {
  state: UpdateVehicleFormState;
  onBack: () => void;
  vehicleData: VehicleProps;
  isEntityDirty: boolean;
  initialFormValues: Record<string, string>;
  onFormValuesChange: (values: Record<string, string>) => void;
}

interface UpdateVehicleFormProps {
  vehicleData: VehicleProps;
  handleCloseUpdateVehicle: () => void;
  isUpdateVehicleOpen: boolean;
}

export type {
  UpdateVehicleFormState,
  UpdateVehicleFormProps,
  UpdateVehicleFormSubmitProps,
};
