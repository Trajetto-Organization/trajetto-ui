import { CommandBusinessInputValue } from "@/app/(protected)/_components/dto";

interface CreateBranchValidationError {
  cep?: string[];
  city?: string[];
  uf?: string[];
  street?: string[];
  address_number?: string[];
  cnpj?: string[];
  complement?: string[];
  cnae?: string[];
  corporate_reason?: string[];
  email?: string[];
  responsible_name?: string[];
  telephone?: string[];
  erp_code?: string[];
  businessId?: string[];
  createBranchErrorMessage?: string;
}

interface CreateBranchFormState {
  createBranchError?: CreateBranchValidationError;
  successMessage?: string;
}

interface CreateBranchContainerProps {
  state: CreateBranchFormState;
  isCreateBranchForm: boolean;
  onBack: () => void;
}

interface SelectBusinessByStepProps {
  searchBusinessInputValue: string;
  handleUpdateSearchBussinessInputValue: (
    data: CommandBusinessInputValue,
  ) => void;
  onContinue: () => void;
  errorBusinessId?: string[];
}

export type {
  CreateBranchContainerProps,
  CreateBranchFormState,
  CommandBusinessInputValue,
  SelectBusinessByStepProps,
};
