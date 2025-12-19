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

interface CreateAccountPayableFormSubmitProps {
  state: CreateAccountPayableFormState;
  onBack: () => void;
  displayAmount: string;
  displayAmountPaid: string;
  handleAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAmountBlur: () => void;
  handleAmountPaidChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAmountPaidBlur: () => void;
}

export type {
  CreateAccountPayableFormState,
  CreateAccountPayableFormSubmitProps,
};
