import {
  CommandBranchInputValue,
  CommandServiceOrderInputValue,
  CommandUserInputValue,
} from "@/app/(protected)/_components/dto";

import { DashboardAccountPayableProps } from "../../dto";

interface DashboardUpdateAccountPayableValidationError {
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

interface DashboardUpdateAccountPayableFormState {
  updateAccountPayableError?: DashboardUpdateAccountPayableValidationError;
  successMessage?: string;
}

interface DashboardUpdateAccountPayableContainerProps {
  state: DashboardUpdateAccountPayableFormState;
  onBack: () => void;
  accountPayableData: DashboardAccountPayableProps;
  isBusinessAndEntityDirty: boolean;
  isUpdateAccountPayableOpen: boolean;
}

interface DashboardSelectBusinessBranchStepProps {
  state: DashboardUpdateAccountPayableFormState;
  commandBranchInputValue: CommandBranchInputValue;
  businessId: string;
  handleUpdateSearchBranchInputValue: (
    branchData: CommandBranchInputValue,
  ) => void;
  onContinue: () => void;
}

interface DashboardSelectServiceOrderStepProps {
  state: DashboardUpdateAccountPayableFormState;
  businessId: string;
  commandServiceOrderInputValue: CommandServiceOrderInputValue;
  handleUpdateSearchServiceOrderInputValue: (
    serviceOrderData: CommandServiceOrderInputValue,
  ) => void;
  onContinue: () => void;
  onBack: () => void;
}

interface DashboardSelectUserStepProps {
  state: DashboardUpdateAccountPayableFormState;
  businessId: string;
  commandUserInputValue: CommandUserInputValue;
  handleUpdateSearchUserInputValue: (userData: CommandUserInputValue) => void;
  onContinue: () => void;
  onBack: () => void;
}

interface DashboardUpdateAccountPayableFormProps {
  accountPayableData: DashboardAccountPayableProps;
  handleCloseUpdateAccountPayable: () => void;
  isUpdateAccountPayableOpen: boolean;
}

export type {
  DashboardUpdateAccountPayableFormState,
  DashboardUpdateAccountPayableFormProps,
  DashboardUpdateAccountPayableContainerProps,
  DashboardSelectBusinessBranchStepProps,
  DashboardSelectServiceOrderStepProps,
  DashboardSelectUserStepProps,
};
