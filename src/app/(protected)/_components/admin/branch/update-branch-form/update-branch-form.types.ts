import type { BranchProps } from "../branch.types";

interface UpdateBranchValidationError {
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

interface UpdateBranchFormState {
  updateBranchError?: UpdateBranchValidationError;
  successMessage?: string;
}

interface UpdateBranchFormSubmitProps {
  state: UpdateBranchFormState;
  handleCloseUpdateBranch: () => void;
  branchData: BranchProps;
  isUpdateBranchOpen: boolean;
}

export type { UpdateBranchFormSubmitProps, UpdateBranchFormState };
