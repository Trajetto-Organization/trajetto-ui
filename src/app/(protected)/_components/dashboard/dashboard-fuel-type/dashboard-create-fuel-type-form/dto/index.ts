interface DashboardCreateFuelTypeValidationError {
  description?: string[];
  businessId?: string[];
  createFuelTypeErrorMessage?: string;
}

interface DashboardCreateFuelTypeFormState {
  createFuelTypeError?: DashboardCreateFuelTypeValidationError;
  successMessage?: string;
}

interface DashboardCreateFuelTypeContainerProps {
  state: DashboardCreateFuelTypeFormState;
  handleOpenCreateFuelTypeForm: () => void;
}

export type {
  DashboardCreateFuelTypeContainerProps,
  DashboardCreateFuelTypeFormState,
};
