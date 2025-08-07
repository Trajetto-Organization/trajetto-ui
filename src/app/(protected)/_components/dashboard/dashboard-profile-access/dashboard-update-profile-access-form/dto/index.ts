interface DashboardUpdateBusinessValidationError {
  name?: string[];
  businessId?: string[];
  updateProfileAccessErrorMessage?: string;
}

interface DashboardUpdateProfileAccessFormState {
  updateProfileAccessError?: DashboardUpdateBusinessValidationError;
  successMessage?: string;
}

interface DashboardUpdateProfileAccessContainerProps {
  state: DashboardUpdateProfileAccessFormState;
  handleCloseUpdateProfileAccess: () => void;
  handleUpdateProfileAccessName: (updatedName: string) => void;
  profileAccessName: string;
  isDirty: boolean;
}

export type {
  DashboardUpdateProfileAccessContainerProps,
  DashboardUpdateProfileAccessFormState,
};
