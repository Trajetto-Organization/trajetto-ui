interface DashboardCreateBranchValidationError {
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

interface DashboardCreateBranchFormState {
  createBranchError?: DashboardCreateBranchValidationError;
  successMessage?: string;
}

interface DashboardCreateBranchContainerProps {
  state: DashboardCreateBranchFormState;
  isCreateBranchForm: boolean;
  handleOpenCreateBranchForm: () => void;
}

export type {
  DashboardCreateBranchContainerProps,
  DashboardCreateBranchFormState,
};
