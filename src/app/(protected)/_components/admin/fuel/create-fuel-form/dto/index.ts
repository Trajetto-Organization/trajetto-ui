import {
  CommandBranchInputValue,
  CommandBusinessInputValue,
  CommandDriverInputValue,
  CommandVehicleInputValue,
  CommandFuelTypeInputValue,
} from "@/app/(protected)/_components/dto";

interface CreateFuelValidationError {
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

interface CreateFuelFormState {
  createFuelError?: CreateFuelValidationError;
  successMessage?: string;
}

interface CreateFuelContainerProps {
  state: CreateFuelFormState;
  onBack: () => void;
  commandVehicleInputValue: CommandVehicleInputValue;
  commandBusinessInputValue: CommandBusinessInputValue;
}

interface SelectBusinessBranchStepProps {
  state: CreateFuelFormState;
  commandBusinessInputValue: CommandBusinessInputValue;
  commandBranchInputValue: CommandBranchInputValue;
  handleUpdateSearchBusinessInputValue: (
    businessData: CommandBusinessInputValue,
  ) => void;
  handleUpdateSearchBranchInputValue: (
    branchData: CommandBranchInputValue,
  ) => void;
  onContinue: () => void;
}

interface SelectVehicleDriverStepProps {
  state: CreateFuelFormState;
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

interface SelectFuelTypeStepProps {
  state: CreateFuelFormState;
  businessId: string;
  commandFuelTypeInputValue: CommandFuelTypeInputValue;
  handleUpdateSearchFuelTypeInputValue: (
    fuelTypeData: CommandFuelTypeInputValue,
  ) => void;
  onContinue: () => void;
  onBack: () => void;
}

export type {
  CreateFuelFormState,
  CreateFuelContainerProps,
  SelectBusinessBranchStepProps,
  SelectVehicleDriverStepProps,
  SelectFuelTypeStepProps,
};
