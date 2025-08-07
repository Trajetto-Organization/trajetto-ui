interface DashboardCreateProfileAccessValidationError {
  name?: string[];
  businessId?: string[];
  createProfileAccessErrorMessage?: string;
}

interface DashboardCreateProfileAccessFormState {
  createProfileAccessError?: DashboardCreateProfileAccessValidationError;
  successMessage?: string;
}

interface DashboardCreateProfileAccessContainerProps {
  state: DashboardCreateProfileAccessFormState;
  handleOpenCreateProfileAccessForm: () => void;
}

export type {
  DashboardCreateProfileAccessContainerProps,
  DashboardCreateProfileAccessFormState,
};
