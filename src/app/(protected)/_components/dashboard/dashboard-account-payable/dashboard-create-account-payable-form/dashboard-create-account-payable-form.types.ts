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
  initialFormValues: Record<string, string>;
  onFormValuesChange: (values: Record<string, string>) => void;
}

export type {
  DashboardCreateAccountPayableFormState,
  DashboardCreateAccountPayableFormSubmitProps,
};
