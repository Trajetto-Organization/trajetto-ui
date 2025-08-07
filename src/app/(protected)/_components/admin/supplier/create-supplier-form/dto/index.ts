interface CreateSupplierValidationError {
  name?: string[];
  cnpj?: string[];
  cep?: string[];
  city?: string[];
  uf?: string[];
  street?: string[];
  address_number?: string[];
  complement?: string[];
  telephone?: string[];
  email?: string[];
  businessId?: string[];
  createSupplierErrorMessage?: string;
}

interface CreateSupplierFormState {
  createSupplierError?: CreateSupplierValidationError;
  successMessage?: string;
}

interface CommandBusinessInputValue {
  businessId: string;
  searchBusinessInputValue: string;
}

interface CreateSupplierContainerProps {
  state: CreateSupplierFormState;
  isCreateSupplierForm: boolean;
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
  CreateSupplierContainerProps,
  CreateSupplierFormState,
  CommandBusinessInputValue,
  SelectBusinessByStepProps,
};
