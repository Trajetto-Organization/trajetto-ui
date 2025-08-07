import {
  CommandBranchInputValue,
  CommandDriverInputValue,
  CommandTrafficViolationCodeInputValue,
  CommandVehicleInputValue,
} from "@/app/(protected)/_components/dto";

interface DashboardCreateFineValidationError {
  violation_date?: string[];
  due_date?: string[];
  payment_date?: string[];
  amount?: string[];
  points?: string[];
  location?: string[];
  observation?: string[];
  branchId?: string[];
  driverId?: string[];
  vehicleId?: string[];
  trafficViolationCodeId?: string[];
  createFineErrorMessage?: string;
}

interface DashboardCreateFineFormState {
  createFineError?: DashboardCreateFineValidationError;
  successMessage?: string;
}

interface DashboardCreateFineContainerProps {
  state: DashboardCreateFineFormState;
  onBack: () => void;
}

interface DashboardSelectBranchStepProps {
  state: DashboardCreateFineFormState;
  businessId: string;
  commandBranchInputValue: CommandBranchInputValue;
  handleUpdateSearchBranchInputValue: (
    branchData: CommandBranchInputValue,
  ) => void;
  onContinue: () => void;
}

interface DashboardSelectVehicleDriverStepProps {
  state: DashboardCreateFineFormState;
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

interface DashboardSelectViolationCodeStepProps {
  state: DashboardCreateFineFormState;
  commandTrafficViolationCodeInputValue: CommandTrafficViolationCodeInputValue;
  handleUpdateSearchTrafficViolationCodeInputValue: (
    trafficViolationCodeData: CommandTrafficViolationCodeInputValue,
  ) => void;
  onContinue: () => void;
  onBack: () => void;
}

export type {
  DashboardCreateFineFormState,
  DashboardCreateFineContainerProps,
  DashboardSelectBranchStepProps,
  DashboardSelectVehicleDriverStepProps,
  DashboardSelectViolationCodeStepProps,
};
