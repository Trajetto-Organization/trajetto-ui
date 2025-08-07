import { CommandBranchInputValue } from "@/app/(protected)/_components/dto";
import { DashboardDriverProps } from "../../dto";

interface DashboardUpdateDriverValidationError {
  name?: string[];
  birth_date?: string[];
  cnh?: string[];
  cpf?: string[];
  rg?: string[];
  cep?: string[];
  city?: string[];
  uf?: string[];
  street?: string[];
  address_number?: string[];
  complement?: string[];
  status?: string[];
  contract_type?: string[];
  businessId?: string[];
  branchId?: string[];
  updateDriverErrorMessage?: string;
}

interface DashboardUpdateDriverFormState {
  updateDriverError?: DashboardUpdateDriverValidationError;
  successMessage?: string;
}

interface DashboardUpdateDriverFormProps {
  driverData: DashboardDriverProps;
  handleCloseUpdateDriver: () => void;
  isUpdateDriverOpen: boolean;
}

interface DashboardUpdateDriverContainerProps {
  state: DashboardUpdateDriverFormState;
  driverData: DashboardDriverProps;
  isBranchDirty: boolean;
  isUpdateDriverOpen: boolean;
  onBack: () => void;
}

interface DashboardSelectBranchForUpdateProps {
  state: DashboardUpdateDriverFormState;
  businessId: string;
  commandBranchInputValue: CommandBranchInputValue;
  handleUpdateSearchBranchInputValue: (
    branchData: CommandBranchInputValue,
  ) => void;
  onContinue: () => void;
}

export type {
  DashboardUpdateDriverFormState,
  DashboardUpdateDriverFormProps,
  DashboardUpdateDriverContainerProps,
  DashboardSelectBranchForUpdateProps,
};
