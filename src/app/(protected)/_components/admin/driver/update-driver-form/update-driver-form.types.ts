import type { DriverProps } from "../driver.types";

interface UpdateDriverValidationError {
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
  updateDriverErrorMessage?: string;
}

interface UpdateDriverFormState {
  updateDriverError?: UpdateDriverValidationError;
  successMessage?: string;
}

interface UpdateDriverFormProps {
  driverData: DriverProps;
  handleCloseUpdateDriver: () => void;
  isUpdateDriverOpen: boolean;
}

interface UpdateDriverFormSubmitProps {
  state: UpdateDriverFormState;
  driverData: DriverProps;
  isBusinessAndBranchDirty: boolean;
  isUpdateDriverOpen: boolean;
  onBack: () => void;
  initialFormValues: Record<string, string>;
  onFormValuesChange: (values: Record<string, string>) => void;
}

export type {
  UpdateDriverFormState,
  UpdateDriverFormProps,
  UpdateDriverFormSubmitProps,
};
