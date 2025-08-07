import {
  CommandBranchInputValue,
  CommandBusinessInputValue,
  CommandServiceOrderInputValue,
  CommandUserInputValue,
} from "@/app/(protected)/_components/dto";

interface CreateAccountPayableValidationError {
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

interface CreateAccountPayableFormState {
  createAccountPayableError?: CreateAccountPayableValidationError;
  successMessage?: string;
}

interface CreateAccountPayableContainerProps {
  state: CreateAccountPayableFormState;
  onBack: () => void;
  displayAmount: string;
  displayAmountPaid: string;
  handleAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAmountBlur: () => void;
  handleAmountPaidChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAmountPaidBlur: () => void;
}

interface SelectBusinessBranchStepProps {
  state: CreateAccountPayableFormState;
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
  state: CreateAccountPayableFormState;
  businessId: string;
  commandServiceOrderInputValue: CommandServiceOrderInputValue;
  handleUpdateSearchServiceOrderInputValue: (
    serviceOrderData: CommandServiceOrderInputValue,
  ) => void;
  onContinue: () => void;
  onBack: () => void;
}

interface SelectUserStepProps {
  state: CreateAccountPayableFormState;
  businessId: string;
  commandUserInputValue: CommandUserInputValue;
  handleUpdateSearchUserInputValue: (userData: CommandUserInputValue) => void;
  onContinue: () => void;
  onBack: () => void;
}

export type {
  CreateAccountPayableFormState,
  CreateAccountPayableContainerProps,
  SelectBusinessBranchStepProps,
  SelectServiceOrderStepProps,
  SelectUserStepProps,
};
