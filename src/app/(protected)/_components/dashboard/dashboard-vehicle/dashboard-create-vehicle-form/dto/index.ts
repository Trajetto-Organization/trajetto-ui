import {
  CommandBranchInputValue,
  CommandDriverInputValue,
  CommandFuelTypeInputValue,
  CommandVehicleTypeInputValue,
} from "@/app/(protected)/_components/dto";

interface DashboardCreateVehicleValidationError {
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
  createVehicleErrorMessage?: string;
}

interface DashboardCreateVehicleFormState {
  createVehicleError?: DashboardCreateVehicleValidationError;
  successMessage?: string;
}

interface DashboardCreateVehicleContainerProps {
  state: DashboardCreateVehicleFormState;
  onBack: () => void;
}

interface DashboardSelectBranchByStepProps {
  state: DashboardCreateVehicleFormState;
  businessId: string;
  commandBranchInputValue: CommandBranchInputValue;
  handleUpdateSearchBranchInputValue: (
    branchData: CommandBranchInputValue,
  ) => void;
  onContinue: () => void;
}

interface DashboardSelectDriverVehicleTypeStepProps {
  state: DashboardCreateVehicleFormState;
  businessId: string;
  commandDriverInputValue: CommandDriverInputValue;
  commandVehicleTypeInputValue: CommandVehicleTypeInputValue;
  handleUpdateSearchDriverInputValue: (
    driverData: CommandDriverInputValue,
  ) => void;
  handleUpdateSearchVehicleTypeInputValue: (
    vehicleTypeData: CommandVehicleTypeInputValue,
  ) => void;
  onContinue: () => void;
  onBack: () => void;
}

interface DashboardSelectFuelTypeStepProps {
  state: DashboardCreateVehicleFormState;
  businessId: string;
  commandFuelTypeInputValue: CommandFuelTypeInputValue;
  handleUpdateSearchFuelTypeInputValue: (
    fuelTypeData: CommandFuelTypeInputValue,
  ) => void;
  onContinue: () => void;
  onBack: () => void;
}

export type {
  DashboardCreateVehicleFormState,
  DashboardCreateVehicleContainerProps,
  DashboardSelectBranchByStepProps,
  DashboardSelectDriverVehicleTypeStepProps,
  DashboardSelectFuelTypeStepProps,
  CommandBranchInputValue,
  CommandDriverInputValue,
  CommandVehicleTypeInputValue,
  CommandFuelTypeInputValue,
};
