import {
  CommandBranchInputValue,
  CommandBusinessInputValue,
  CommandServiceOrderInputValue,
  CommandUserInputValue,
} from "@/app/(protected)/_components/dto";

import { AccountPayableProps } from "../../dto";

interface UpdateAccountPayableValidationError {
  issue_date?: string[];
  due_date?: string[];
  payment_date?: string[];
  amount?: string[];
  amount_paid?: string[];
  branchId?: string[];
  serviceOrderId?: string[];
  registrationUserId?: string[];
  businessId?: string[];
  updateAccountPayableErrorMessage?: string;
}

interface UpdateAccountPayableFormState {
  updateAccountPayableError?: UpdateAccountPayableValidationError;
  successMessage?: string;
}

interface UpdateAccountPayableContainerProps {
  state: UpdateAccountPayableFormState;
  onBack: () => void;
  accountPayableData: AccountPayableProps;
  isBusinessAndEntityDirty: boolean;
  isUpdateAccountPayableOpen: boolean;
}

interface SelectBusinessBranchStepProps {
  state: UpdateAccountPayableFormState;
  commandBusinessInputValue: CommandBusinessInputValue;
  commandBranchInputValue: CommandBranchInputValue;
  handleUpdateSearchBusinessInputValue: (
    businessData: CommandBusinessInputValue,
  ) => void;
  handleUpdateSearchBranchInputValue: (
    branchData: CommandBranchInputValue,
  ) => void;
  onContinue: () => void;
}

interface SelectServiceOrderStepProps {
  state: UpdateAccountPayableFormState;
  businessId: string;
  commandServiceOrderInputValue: CommandServiceOrderInputValue;
  handleUpdateSearchServiceOrderInputValue: (
    serviceOrderData: CommandServiceOrderInputValue,
  ) => void;
  onContinue: () => void;
  onBack: () => void;
}

interface SelectUserStepProps {
  state: UpdateAccountPayableFormState;
  businessId: string;
  commandUserInputValue: CommandUserInputValue;
  handleUpdateSearchUserInputValue: (userData: CommandUserInputValue) => void;
  onContinue: () => void;
  onBack: () => void;
}

interface UpdateAccountPayableFormProps {
  accountPayableData: AccountPayableProps;
  handleCloseUpdateAccountPayable: () => void;
  isUpdateAccountPayableOpen: boolean;
}

export type {
  UpdateAccountPayableFormState,
  UpdateAccountPayableFormProps,
  UpdateAccountPayableContainerProps,
  SelectBusinessBranchStepProps,
  SelectServiceOrderStepProps,
  SelectUserStepProps,
};
