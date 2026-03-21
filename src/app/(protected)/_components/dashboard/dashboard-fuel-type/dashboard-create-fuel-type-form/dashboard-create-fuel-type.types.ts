interface DashboardCreateFuelTypeValidationError {
  description?: string[];
  businessId?: string[];
  createFuelTypeErrorMessage?: string;
}

interface DashboardCreateFuelTypeFormState {
  createFuelTypeError?: DashboardCreateFuelTypeValidationError;
  successMessage?: string;
}

interface DashboardCreateFuelTypeSubmitProps {
  state: DashboardCreateFuelTypeFormState;
  handleOpenCreateFuelTypeForm: () => void;
}

export type {
  DashboardCreateFuelTypeSubmitProps,
  DashboardCreateFuelTypeFormState,
};
