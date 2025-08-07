import {
  CommandBranchInputValue,
  CommandBusinessInputValue,
} from "@/app/(protected)/_components/dto";

import { DriverProps } from "../../dto";

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

interface UpdateDriverContainerProps {
  state: UpdateDriverFormState;
  driverData: DriverProps;
  isBusinessAndBranchDirty: boolean;
  isUpdateDriverOpen: boolean;
  onBack: () => void;
}

interface SelectBusinessForUpdateProps {
  state: UpdateDriverFormState;
  commandBusinnessInputValue: CommandBusinessInputValue;
  commandBranchInputValue: CommandBranchInputValue;
  handleUpdateSearchBusinnessInputValue: (
    businessData: CommandBusinessInputValue,
  ) => void;
  handleUpdateSearchBranchInputValue: (
    branchData: CommandBranchInputValue,
  ) => void;
  onContinue: () => void;
}

export type {
  UpdateDriverFormState,
  UpdateDriverFormProps,
  UpdateDriverContainerProps,
  SelectBusinessForUpdateProps,
};
