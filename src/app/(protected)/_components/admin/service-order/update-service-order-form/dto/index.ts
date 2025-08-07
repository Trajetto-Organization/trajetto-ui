import {
  CommandBranchInputValue,
  CommandBusinessInputValue,
  CommandSupplierInputValue,
  CommandUserInputValue,
  CommandVehicleInputValue,
} from "@/app/(protected)/_components/dto";

import { ServiceOrderProps } from "../../dto";

interface UpdateServiceOrderValidationError {
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
  updateServiceOrderErrorMessage?: string;
}

interface UpdateServiceOrderFormState {
  updateServiceOrderError?: UpdateServiceOrderValidationError;
  successMessage?: string;
}

interface UpdateServiceOrderContainerProps {
  state: UpdateServiceOrderFormState;
  onBack: () => void;
  serviceOrderData: ServiceOrderProps;
  isBusinessAndEntityDirty: boolean;
  isUpdateServiceOrderOpen: boolean;
  commandBusinessInputValue: CommandBusinessInputValue;
  commandVehicleInputValue: CommandVehicleInputValue;
}

interface SelectBusinessByStepProps {
  state: UpdateServiceOrderFormState;
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
  state: UpdateServiceOrderFormState;
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
  state: UpdateServiceOrderFormState;
  businessId: string;
  commandUserInputValue: CommandUserInputValue;
  handleUpdateSearchUserInputValue: (userData: CommandUserInputValue) => void;
  onContinue: () => void;
  onBack: () => void;
}

interface UpdateServiceOrderFormProps {
  serviceOrderData: ServiceOrderProps;
  handleCloseUpdateServiceOrder: () => void;
  isUpdateServiceOrderOpen: boolean;
}

export type {
  UpdateServiceOrderFormState,
  UpdateServiceOrderFormProps,
  UpdateServiceOrderContainerProps,
  SelectBusinessByStepProps,
  SelectVehicleSupplierStepProps,
  SelectUserStepProps,
};
