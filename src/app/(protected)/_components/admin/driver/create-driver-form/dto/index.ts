import {
  CommandBranchInputValue,
  CommandBusinessInputValue,
} from "@/app/(protected)/_components/dto";

interface CreateSupplierValidationError {
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

interface CreateDriverFormState {
  createDriverError?: CreateSupplierValidationError;
  successMessage?: string;
}

interface CreateDriverFormSubmitProps {
  state: CreateDriverFormState;
  isCreateDriverForm: boolean;
  onBack: () => void;
}

export type {
  CreateDriverFormState,
  CreateDriverFormSubmitProps,
  CommandBusinessInputValue,
  CommandBranchInputValue,
};
