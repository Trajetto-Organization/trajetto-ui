import {
  CommandBranchInputValue,
  CommandServiceOrderInputValue,
  CommandUserInputValue,
} from "@/app/(protected)/_components/dto";

interface DashboardCreateAccountPayableValidationError {
  issue_date?: string[];
  due_date?: string[];
  payment_date?: string[];
  amount?: string[];
  amount_paid?: string[];
  branchId?: string[];
  serviceOrderId?: string[];
  registrationUserId?: string[];
  businessId?: string[];
  createAccountPayableErrorMessage?: string;
}

interface DashboardCreateAccountPayableFormState {
  createAccountPayableError?: DashboardCreateAccountPayableValidationError;
  successMessage?: string;
}

interface DashboardCreateAccountPayableContainerProps {
  state: DashboardCreateAccountPayableFormState;
  onBack: () => void;
  displayAmount: string;
  displayAmountPaid: string;
  handleAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAmountBlur: () => void;
  handleAmountPaidChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAmountPaidBlur: () => void;
}

interface DashboardSelectBusinessBranchStepProps {
  state: DashboardCreateAccountPayableFormState;
  commandBranchInputValue: CommandBranchInputValue;
  handleUpdateSearchBranchInputValue: (
    branchData: CommandBranchInputValue,
  ) => void;
  onContinue: () => void;
  businessId: string;
}

interface DashboardSelectServiceOrderStepProps {
  state: DashboardCreateAccountPayableFormState;
  businessId: string;
  commandServiceOrderInputValue: CommandServiceOrderInputValue;
  handleUpdateSearchServiceOrderInputValue: (
    serviceOrderData: CommandServiceOrderInputValue,
  ) => void;
  onContinue: () => void;
  onBack: () => void;
}

interface DashboardSelectUserStepProps {
  state: DashboardCreateAccountPayableFormState;
  businessId: string;
  commandUserInputValue: CommandUserInputValue;
  handleUpdateSearchUserInputValue: (userData: CommandUserInputValue) => void;
  onContinue: () => void;
  onBack: () => void;
}

export type {
  DashboardCreateAccountPayableFormState,
  DashboardCreateAccountPayableContainerProps,
  DashboardSelectBusinessBranchStepProps,
  DashboardSelectServiceOrderStepProps,
  DashboardSelectUserStepProps,
};
