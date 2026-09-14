interface CreateAccountPayableValidationError {
  issue_date?: string[];
  due_date?: string[];
  payment_date?: string[];
  amount?: string[];
  amount_paid?: string[];
  category?: string[];
  category_description?: string[];
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
  initialFormValues: Record<string, string>;
  onFormValuesChange: (values: Record<string, string>) => void;
}

export type {
  CreateAccountPayableFormState,
  CreateAccountPayableFormSubmitProps,
};
