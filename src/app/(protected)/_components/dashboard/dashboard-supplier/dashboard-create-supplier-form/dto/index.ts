interface DashboardCreateSupplierValidationError {
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

interface DashboardCreateSupplierFormState {
  createSupplierError?: DashboardCreateSupplierValidationError;
  successMessage?: string;
}

interface DashboardCreateSupplierContainerProps {
  state: DashboardCreateSupplierFormState;
  handleOpenCreateSupplierForm: () => void;
  isCreateSupplierForm: boolean;
}

export type {
  DashboardCreateSupplierContainerProps,
  DashboardCreateSupplierFormState,
};
