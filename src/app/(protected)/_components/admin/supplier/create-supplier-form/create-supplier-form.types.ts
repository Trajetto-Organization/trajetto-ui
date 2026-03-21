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

interface CreateSupplierFormSubmitProps {
  state: CreateSupplierFormState;
  isCreateSupplierForm: boolean;
  onBack: () => void;
  initialFormValues: Record<string, string>;
  onFormValuesChange: (values: Record<string, string>) => void;
}

export type {
  CreateSupplierFormSubmitProps,
  CreateSupplierFormState,
  CommandBusinessInputValue,
};
