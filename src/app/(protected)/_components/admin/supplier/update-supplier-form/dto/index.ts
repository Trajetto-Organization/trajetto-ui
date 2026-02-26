import { SupplierProps } from "../../dto";

interface UpdateSupplierValidationError {
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

interface UpdateSupplierFormState {
  updateSupplierError?: UpdateSupplierValidationError;
  successMessage?: string;
}

interface UpdateSupplierFormSubmitProps {
  state: UpdateSupplierFormState;
  handleCloseUpdateSupplier: () => void;
  supplierData: SupplierProps;
  isUpdateSupplierOpen: boolean;
  isDirty: boolean;
  initialFormValues: Record<string, string>;
  onFormValuesChange: (values: Record<string, string>) => void;
}

export type { UpdateSupplierFormSubmitProps, UpdateSupplierFormState };
