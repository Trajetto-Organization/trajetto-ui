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

interface UpdateAccountPayableFormSubmitProps {
  state: UpdateAccountPayableFormState;
  onBack: () => void;
  isBusinessAndEntityDirty: boolean;
  accountPayableData: AccountPayableProps;
  initialFormValues: Record<string, string>;
  onFormValuesChange: (values: Record<string, string>) => void;
}

interface UseUpdateAccountPayableFormProps {
  state: UpdateAccountPayableFormState | null;
  handleCloseUpdateAccountPayable: () => void;
  accountPayableData: AccountPayableProps;
  isUpdateAccountPayableOpen: boolean;
}

interface UpdateAccountPayableFormProps {
  accountPayableData: AccountPayableProps;
  handleCloseUpdateAccountPayable: () => void;
  isUpdateAccountPayableOpen: boolean;
}

export type {
  UpdateAccountPayableFormState,
  UpdateAccountPayableFormProps,
  UpdateAccountPayableFormSubmitProps,
  UseUpdateAccountPayableFormProps,
};
