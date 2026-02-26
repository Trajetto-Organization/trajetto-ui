interface DashboardCreateSupplierValidationError {
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

interface DashboardCreateDriverFormState {
  createDriverError?: DashboardCreateSupplierValidationError;
  successMessage?: string;
}

interface DashboardCreateDriverFormSubmitProps {
  state: DashboardCreateDriverFormState;
  isCreateDriverForm: boolean;
  onBack: () => void;
  initialFormValues: Record<string, string>;
  onFormValuesChange: (values: Record<string, string>) => void;
}

export type {
  DashboardCreateDriverFormState,
  DashboardCreateDriverFormSubmitProps,
};
