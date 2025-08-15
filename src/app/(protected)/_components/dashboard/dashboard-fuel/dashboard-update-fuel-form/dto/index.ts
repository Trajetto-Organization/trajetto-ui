import {
  CommandBranchInputValue,
  CommandDriverInputValue,
  CommandVehicleInputValue,
  CommandFuelTypeInputValue,
} from "@/app/(protected)/_components/dto";

import { DashboardFuelProps } from "../../dto";

interface DashboardUpdateFuelValidationError {
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
  updateFuelErrorMessage?: string;
}

interface DashboardUpdateFuelFormState {
  updateFuelError?: DashboardUpdateFuelValidationError;
  successMessage?: string;
}

interface DashboardUpdateFuelContainerProps {
  state: DashboardUpdateFuelFormState;
  onBack: () => void;
  fuelData: DashboardFuelProps;
  isBusinessAndEntityDirty: boolean;
  isUpdateFuelOpen: boolean;
  commandVehicleInputValue: CommandVehicleInputValue;
}

interface DashboardSelectBranchStepProps {
  state: DashboardUpdateFuelFormState;
  businessId: string;
  commandBranchInputValue: CommandBranchInputValue;
  handleUpdateSearchBranchInputValue: (
    branchData: CommandBranchInputValue,
  ) => void;
  onContinue: () => void;
}

interface DashboardSelectVehicleDriverStepProps {
  state: DashboardUpdateFuelFormState;
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
  state: DashboardUpdateFuelFormState;
  businessId: string;
  commandFuelTypeInputValue: CommandFuelTypeInputValue;
  handleUpdateSearchFuelTypeInputValue: (
    fuelTypeData: CommandFuelTypeInputValue,
  ) => void;
  onContinue: () => void;
  onBack: () => void;
}

interface DashboardUpdateFuelFormProps {
  fuelData: DashboardFuelProps;
  handleCloseUpdateFuel: () => void;
  isUpdateFuelOpen: boolean;
}

export type {
  DashboardUpdateFuelFormState,
  DashboardUpdateFuelFormProps,
  DashboardUpdateFuelContainerProps,
  DashboardSelectBranchStepProps,
  DashboardSelectVehicleDriverStepProps,
  DashboardSelectFuelTypeStepProps,
};
