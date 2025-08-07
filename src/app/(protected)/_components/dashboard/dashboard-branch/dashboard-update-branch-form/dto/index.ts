import { DashboardBranchProps } from "../../dto";

interface DashboardUpdateBranchValidationError {
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
  updateBranchErrorMessage?: string;
}

interface DashboardUpdateBranchFormState {
  updateBranchError?: DashboardUpdateBranchValidationError;
  successMessage?: string;
}

interface DashboardUpdateBranchContainerProps {
  state: DashboardUpdateBranchFormState;
  handleCloseUpdateBranch: () => void;
  branchData: DashboardBranchProps;
  isUpdateBranchOpen: boolean;
}

export type {
  DashboardUpdateBranchContainerProps,
  DashboardUpdateBranchFormState,
};
