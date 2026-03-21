import type { DashboardDriverProps } from "../dashboard-driver.types";

interface DashboardUpdateDriverValidationError {
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

interface DashboardUpdateDriverFormState {
  updateDriverError?: DashboardUpdateDriverValidationError;
  successMessage?: string;
}

interface DashboardUpdateDriverFormProps {
  driverData: DashboardDriverProps;
  handleCloseUpdateDriver: () => void;
  isUpdateDriverOpen: boolean;
}

interface DashboardUpdateDriverSubmitProps {
  state: DashboardUpdateDriverFormState;
  driverData: DashboardDriverProps;
  isBranchDirty: boolean;
  isUpdateDriverOpen: boolean;
  onBack: () => void;
  initialFormValues: Record<string, string>;
  onFormValuesChange: (values: Record<string, string>) => void;
}

export type {
  DashboardUpdateDriverFormState,
  DashboardUpdateDriverFormProps,
  DashboardUpdateDriverSubmitProps,
};
