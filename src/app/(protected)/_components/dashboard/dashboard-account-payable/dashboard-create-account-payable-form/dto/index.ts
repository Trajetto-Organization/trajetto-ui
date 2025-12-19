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

interface DashboardCreateAccountPayableFormSubmitProps {
  state: DashboardCreateAccountPayableFormState;
  onBack: () => void;
  displayAmount: string;
  displayAmountPaid: string;
  handleAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAmountBlur: () => void;
  handleAmountPaidChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAmountPaidBlur: () => void;
}

export type {
  DashboardCreateAccountPayableFormState,
  DashboardCreateAccountPayableFormSubmitProps,
};
