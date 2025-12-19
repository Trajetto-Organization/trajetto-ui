interface DashboardCreateProfileAccessValidationError {
  name?: string[];
  businessId?: string[];
  createProfileAccessErrorMessage?: string;
}

interface DashboardCreateProfileAccessFormState {
  createProfileAccessError?: DashboardCreateProfileAccessValidationError;
  successMessage?: string;
}

interface DashboardCreateProfileAccessFormSubmitProps {
  state: DashboardCreateProfileAccessFormState;
  handleOpenCreateProfileAccessForm: () => void;
}

export type {
  DashboardCreateProfileAccessFormSubmitProps,
  DashboardCreateProfileAccessFormState,
};
