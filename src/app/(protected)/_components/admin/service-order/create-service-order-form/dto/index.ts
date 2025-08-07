import {
  CommandBranchInputValue,
  CommandBusinessInputValue,
  CommandSupplierInputValue,
  CommandUserInputValue,
  CommandVehicleInputValue,
} from "@/app/(protected)/_components/dto";

interface CreateServiceOrderValidationError {
  date?: string[];
  completion_date?: string[];
  maintenance_type?: string[];
  total_amount?: string[];
  current_mileage_at_service?: string[];
  maintenance_interval_km_at_service?: string[];
  last_maintenance_mileage_at_service?: string[];
  new_mileage_after_service?: string[];
  vehicleId?: string[];
  responsibleUserId?: string[];
  branchId?: string[];
  supplierId?: string[];
  businessId?: string[];
  createServiceOrderErrorMessage?: string;
}

interface CreateServiceOrderFormState {
  createServiceOrderError?: CreateServiceOrderValidationError;
  successMessage?: string;
}

interface CreateServiceOrderContainerProps {
  state: CreateServiceOrderFormState;
  onBack: () => void;
  commandVehicleInputValue: CommandVehicleInputValue;
  commandBusinessInputValue: CommandBusinessInputValue;
}

interface SelectBusinessBranchStepProps {
  state: CreateServiceOrderFormState;
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

interface SelectVehicleSupplierStepProps {
  state: CreateServiceOrderFormState;
  businessId: string;
  commandVehicleInputValue: CommandVehicleInputValue;
  commandSupplierInputValue: CommandSupplierInputValue;
  handleUpdateSearchVehicleInputValue: (
    vehicleData: CommandVehicleInputValue,
  ) => void;
  handleUpdateSearchSupplierInputValue: (
    supplierData: CommandSupplierInputValue,
  ) => void;
  onContinue: () => void;
  onBack: () => void;
}

interface SelectUserStepProps {
  state: CreateServiceOrderFormState;
  businessId: string;
  commandUserInputValue: CommandUserInputValue;
  handleUpdateSearchUserInputValue: (userData: CommandUserInputValue) => void;
  onContinue: () => void;
  onBack: () => void;
}

export type {
  CreateServiceOrderFormState,
  CreateServiceOrderContainerProps,
  SelectBusinessBranchStepProps,
  SelectVehicleSupplierStepProps,
  SelectUserStepProps,
};
