import { BusinessProps } from "@/app/(protected)/_components/dto";

interface UpdateBusinessValidationError {
  corporate_reason?: string[];
  cnpj?: string[];
  cep?: string[];
  city?: string[];
  uf?: string[];
  street?: string[];
  address_number?: string[];
  complement?: string[];
  cnae?: string[];
  erp_code?: string[];
  responsible_name?: string[];
  telephone?: string[];
  email?: string[];
  updateBusinessErrorMessage?: string;
}

interface UpdateBusinessFormState {
  updateBusinessError?: UpdateBusinessValidationError;
  successMessage?: string;
}

interface UpdateBusinessFormSubmitProps {
  state: UpdateBusinessFormState;
  handleCloseUpdateBusiness: () => void;
  businessData: BusinessProps;
  isUpdateBusinessOpen: boolean;
}

export type { UpdateBusinessFormSubmitProps, UpdateBusinessFormState };
