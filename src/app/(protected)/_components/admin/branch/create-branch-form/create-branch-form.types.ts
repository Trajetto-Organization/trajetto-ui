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

interface CreateBranchFormSubmitProps {
  state: CreateBranchFormState;
  isCreateBranchForm: boolean;
  onBack: () => void;
  initialFormValues: Record<string, string>;
  onFormValuesChange: (values: Record<string, string>) => void;
}

export type { CreateBranchFormSubmitProps, CreateBranchFormState };
