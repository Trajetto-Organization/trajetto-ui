import { DashboardSupplierProps } from "../../dto";

interface DashboardUpdateSupplierValidationError {
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
  updateSupplierErrorMessage?: string;
}

interface DashboardUpdateSupplierFormState {
  updateSupplierError?: DashboardUpdateSupplierValidationError;
  successMessage?: string;
}

interface DashboardUpdateSupplierSubmitProps {
  state: DashboardUpdateSupplierFormState;
  handleCloseUpdateSupplier: () => void;
  supplierData: DashboardSupplierProps;
  isUpdateSupplierOpen: boolean;
}

export type {
  DashboardUpdateSupplierSubmitProps,
  DashboardUpdateSupplierFormState,
};
