import {
  CommandBranchInputValue,
  CommandDriverInputValue,
  CommandVehicleInputValue,
  CommandFuelTypeInputValue,
} from "@/app/(protected)/_components/dto";

interface DashboardCreateFuelValidationError {
  current_mileage?: string[];
  liters_amount?: string[];
  price_per_liter?: string[];
  notes?: string[];
  refueling_date?: string[];
  vehicleId?: string[];
  driverId?: string[];
  fuelTypeId?: string[];
  branchId?: string[];
  businessId?: string[];
  createFuelErrorMessage?: string;
}

interface DashboardCreateFuelFormState {
  createFuelError?: DashboardCreateFuelValidationError;
  successMessage?: string;
}

interface DashboardCreateFuelContainerProps {
  onBack: () => void;
  state: DashboardCreateFuelFormState;
  commandVehicleInputValue: CommandVehicleInputValue;
  businessId: string;
}

interface DashboardSelectBranchStepProps {
  state: DashboardCreateFuelFormState;
  businessId: string;
  commandBranchInputValue: CommandBranchInputValue;
  handleUpdateSearchBranchInputValue: (
    branchData: CommandBranchInputValue,
  ) => void;
  onContinue: () => void;
}

interface DashboardSelectVehicleDriverStepProps {
  state: DashboardCreateFuelFormState;
  businessId: string;
  commandVehicleInputValue: CommandVehicleInputValue;
  commandDriverInputValue: CommandDriverInputValue;
  handleUpdateSearchVehicleInputValue: (
    vehicleData: CommandVehicleInputValue,
  ) => void;
  handleUpdateSearchDriverInputValue: (
    driverData: CommandDriverInputValue,
  ) => void;
  onContinue: () => void;
  onBack: () => void;
}

interface DashboardSelectFuelTypeStepProps {
  state: DashboardCreateFuelFormState;
  businessId: string;
  commandFuelTypeInputValue: CommandFuelTypeInputValue;
  handleUpdateSearchFuelTypeInputValue: (
    fuelTypeData: CommandFuelTypeInputValue,
  ) => void;
  onContinue: () => void;
  onBack: () => void;
}

export type {
  DashboardCreateFuelFormState,
  DashboardCreateFuelContainerProps,
  DashboardSelectBranchStepProps,
  DashboardSelectVehicleDriverStepProps,
  DashboardSelectFuelTypeStepProps,
};
