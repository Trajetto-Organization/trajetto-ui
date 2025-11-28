import {
  CommandBranchInputValue,
  CommandBusinessInputValue,
  CommandDriverInputValue,
  CommandTrafficViolationCodeInputValue,
  CommandVehicleInputValue,
} from "@/app/(protected)/_components/dto";

interface CreateFineValidationError {
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
  businessId?: string[];
  latitude?: string[];
  longitude?: string[];
  createFineErrorMessage?: string;
}

interface CreateFineFormState {
  createFineError?: CreateFineValidationError;
  successMessage?: string;
}

interface CreateFineContainerProps {
  state: CreateFineFormState;
  onBack: () => void;
  handleLocationChange: (lat: number, lon: number) => void;
  handleLocationLoadingChange: (isLoading: boolean) => void;
  latitude: number | null;
  longitude: number | null;
  isLoadingLocation: boolean;
}

interface SelectBusinessBranchStepProps {
  state: CreateFineFormState;
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
  state: CreateFineFormState;
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

interface SelectViolationCodeStepProps {
  state: CreateFineFormState;
  commandTrafficViolationCodeInputValue: CommandTrafficViolationCodeInputValue;
  handleUpdateSearchTrafficViolationCodeInputValue: (
    trafficViolationCodeData: CommandTrafficViolationCodeInputValue,
  ) => void;
  onContinue: () => void;
  onBack: () => void;
}

export type {
  CreateFineFormState,
  CreateFineContainerProps,
  SelectBusinessBranchStepProps,
  SelectVehicleDriverStepProps,
  SelectViolationCodeStepProps,
};
