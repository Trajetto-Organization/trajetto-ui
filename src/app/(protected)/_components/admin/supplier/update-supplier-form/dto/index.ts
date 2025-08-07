import { SupplierProps } from "../../dto";
import { CommandBusinessInputValue } from "../../../../dto";

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

interface UpdateSupplierContainerProps {
  state: UpdateSupplierFormState;
  handleCloseUpdateSupplier: () => void;
  supplierData: SupplierProps;
  isUpdateSupplierOpen: boolean;
  isDirty: boolean;
}

interface SelectBusinessStepProps {
  searchBusinessInputValue: string;
  handleUpdateSearchBusinessInputValue: (
    data: CommandBusinessInputValue,
  ) => void;
  onContinue: () => void;
  errorBusinessId?: string[];
}

export type {
  UpdateSupplierContainerProps,
  UpdateSupplierFormState,
  SelectBusinessStepProps,
};
