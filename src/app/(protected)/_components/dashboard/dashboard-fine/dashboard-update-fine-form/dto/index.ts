import {
  CommandBranchInputValue,
  CommandDriverInputValue,
  CommandTrafficViolationCodeInputValue,
  CommandVehicleInputValue,
} from "@/app/(protected)/_components/dto";

import { DashboardFineProps } from "../../dto";

interface DashboardUpdateFineValidationError {
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
  latitude?: string[];
  longitude?: string[];
  updateFineErrorMessage?: string;
}

interface DashboardUpdateFineFormState {
  updateFineError?: DashboardUpdateFineValidationError;
  successMessage?: string;
}

interface DashboardUpdateFineContainerProps {
  state: DashboardUpdateFineFormState;
  onBack: () => void;
  fineData: DashboardFineProps;
  isBusinessAndEntityDirty: boolean;
  isUpdateFineOpen: boolean;
  handleLocationChange: (lat: number, lon: number) => void;
  handleLocationLoadingChange: (isLoading: boolean) => void;
  latitude: number | null;
  longitude: number | null;
  isLoadingLocation: boolean;
}

interface DashboardSelectBranchByStepProps {
  state: DashboardUpdateFineFormState;
  businessId: string;
  commandBranchInputValue: CommandBranchInputValue;
  handleUpdateSearchBranchInputValue: (
    branchData: CommandBranchInputValue,
  ) => void;
  onContinue: () => void;
}

interface DashboardSelectVehicleDriverStepProps {
  state: DashboardUpdateFineFormState;
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
  state: DashboardUpdateFineFormState;
  commandTrafficViolationCodeInputValue: CommandTrafficViolationCodeInputValue;
  handleUpdateSearchTrafficViolationCodeInputValue: (
    trafficViolationCodeData: CommandTrafficViolationCodeInputValue,
  ) => void;
  onContinue: () => void;
  onBack: () => void;
}

interface DashboardUpdateFineFormProps {
  fineData: DashboardFineProps;
  handleCloseUpdateFine: () => void;
  isUpdateFineOpen: boolean;
}

export type {
  DashboardUpdateFineFormState,
  DashboardUpdateFineFormProps,
  DashboardUpdateFineContainerProps,
  DashboardSelectBranchByStepProps,
  DashboardSelectVehicleDriverStepProps,
  DashboardSelectViolationCodeStepProps,
};
