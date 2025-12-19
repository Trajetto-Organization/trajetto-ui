interface CreateBusinessValidationError {
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
  createBusinessErrorMessage?: string;
}

interface CreateBusinessFormState {
  createBusinessError?: CreateBusinessValidationError;
  successMessage?: string;
}

interface CreateBusinessSubmitProps {
  state: CreateBusinessFormState;
  handleOpenCreateBusinessForm: () => void;
  isCreateBusinessForm: boolean;
}

export type { CreateBusinessSubmitProps, CreateBusinessFormState };
