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

interface DashboardUpdateAccountPayableFormSubmitProps {
  state: DashboardUpdateAccountPayableFormState;
  onBack: () => void;
  accountPayableData: DashboardAccountPayableProps;
  isBusinessAndEntityDirty: boolean;
  isUpdateAccountPayableOpen: boolean;
}

interface DashboardUpdateAccountPayableFormProps {
  accountPayableData: DashboardAccountPayableProps;
  handleCloseUpdateAccountPayable: () => void;
  isUpdateAccountPayableOpen: boolean;
}

export type {
  DashboardUpdateAccountPayableFormState,
  DashboardUpdateAccountPayableFormProps,
  DashboardUpdateAccountPayableFormSubmitProps,
};
