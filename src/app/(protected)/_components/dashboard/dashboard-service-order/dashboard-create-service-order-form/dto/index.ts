import {
  CommandBranchInputValue,
  CommandSupplierInputValue,
  CommandUserInputValue,
  CommandVehicleInputValue,
} from "@/app/(protected)/_components/dto";

interface DashboardCreateServiceOrderValidationError {
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

interface DashboardCreateServiceOrderFormState {
  createServiceOrderError?: DashboardCreateServiceOrderValidationError;
  successMessage?: string;
}

interface DashboardCreateServiceOrderContainerProps {
  onBack: () => void;
  state: DashboardCreateServiceOrderFormState;
  commandVehicleInputValue: CommandVehicleInputValue;
  businessId: string;
}

interface DashboardSelectBranchStepProps {
  state: DashboardCreateServiceOrderFormState;
  businessId: string;
  commandBranchInputValue: CommandBranchInputValue;
  handleUpdateSearchBranchInputValue: (
    branchData: CommandBranchInputValue,
  ) => void;
  onContinue: () => void;
}

interface DashboardSelectVehicleSupplierStepProps {
  state: DashboardCreateServiceOrderFormState;
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

interface DashboardSelectUserStepProps {
  state: DashboardCreateServiceOrderFormState;
  businessId: string;
  commandUserInputValue: CommandUserInputValue;
  handleUpdateSearchUserInputValue: (userData: CommandUserInputValue) => void;
  onContinue: () => void;
  onBack: () => void;
}

export type {
  DashboardCreateServiceOrderFormState,
  DashboardCreateServiceOrderContainerProps,
  DashboardSelectBranchStepProps,
  DashboardSelectVehicleSupplierStepProps,
  DashboardSelectUserStepProps,
};
