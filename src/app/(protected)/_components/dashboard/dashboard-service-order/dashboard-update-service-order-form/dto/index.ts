import {
  CommandBranchInputValue,
  CommandSupplierInputValue,
  CommandUserInputValue,
  CommandVehicleInputValue,
} from "@/app/(protected)/_components/dto";

import { DashboardServiceOrderProps } from "../../dto";

interface DashboardUpdateServiceOrderValidationError {
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
  latitude?: string[];
  longitude?: string[];
  updateServiceOrderErrorMessage?: string;
}

interface DashboardUpdateServiceOrderFormState {
  updateServiceOrderError?: DashboardUpdateServiceOrderValidationError;
  successMessage?: string;
}

interface DashboardUpdateServiceOrderContainerProps {
  state: DashboardUpdateServiceOrderFormState;
  onBack: () => void;
  serviceOrderData: DashboardServiceOrderProps;
  isBusinessAndEntityDirty: boolean;
  isUpdateServiceOrderOpen: boolean;
  handleLocationChange: (lat: number, lon: number) => void;
  handleLocationLoadingChange: (isLoading: boolean) => void;
  latitude: number | null;
  longitude: number | null;
  isLoadingLocation: boolean;
}

interface DashboardSelectBranchByStepProps {
  state: DashboardUpdateServiceOrderFormState;
  businessId: string;
  commandBranchInputValue: CommandBranchInputValue;
  handleUpdateSearchBranchInputValue: (
    branchData: CommandBranchInputValue,
  ) => void;
  onContinue: () => void;
}

interface DashboardSelectVehicleSupplierStepProps {
  state: DashboardUpdateServiceOrderFormState;
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
  state: DashboardUpdateServiceOrderFormState;
  businessId: string;
  commandUserInputValue: CommandUserInputValue;
  handleUpdateSearchUserInputValue: (userData: CommandUserInputValue) => void;
  onContinue: () => void;
  onBack: () => void;
}

interface DashboardUpdateServiceOrderFormProps {
  serviceOrderData: DashboardServiceOrderProps;
  handleCloseUpdateServiceOrder: () => void;
  isUpdateServiceOrderOpen: boolean;
}

export type {
  DashboardUpdateServiceOrderFormState,
  DashboardUpdateServiceOrderFormProps,
  DashboardUpdateServiceOrderContainerProps,
  DashboardSelectBranchByStepProps,
  DashboardSelectVehicleSupplierStepProps,
  DashboardSelectUserStepProps,
};
