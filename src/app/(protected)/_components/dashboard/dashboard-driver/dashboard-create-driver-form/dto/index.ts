import { CommandBranchInputValue } from "@/app/(protected)/_components/dto";

interface DashboardCreateSupplierValidationError {
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
  createDriverErrorMessage?: string;
}

interface DashboardCreateDriverFormState {
  createDriverError?: DashboardCreateSupplierValidationError;
  successMessage?: string;
}

interface DashboardCreateDriverContainerProps {
  state: DashboardCreateDriverFormState;
  isCreateDriverForm: boolean;
  onBack: () => void;
}

interface DashboardSelectBranchByStepProps {
  state: DashboardCreateDriverFormState;
  businessId: string;
  commandBranchInputValue: CommandBranchInputValue;
  handleUpdateSearchBranchInputValue: (
    branchData: CommandBranchInputValue,
  ) => void;
  onContinue: () => void;
}

export type {
  DashboardCreateDriverFormState,
  DashboardCreateDriverContainerProps,
  DashboardSelectBranchByStepProps,
  CommandBranchInputValue,
};
