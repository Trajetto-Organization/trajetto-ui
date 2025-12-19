interface DashboardUpdateFuelTypeValidationError {
  description?: string[];
  businessId?: string[];
  updateFuelTypeErrorMessage?: string;
}

interface DashboardUpdateFuelTypeFormState {
  updateFuelTypeError?: DashboardUpdateFuelTypeValidationError;
  successMessage?: string;
}

interface DashboardUpdateFuelTypeFormSubmitProps {
  state: DashboardUpdateFuelTypeFormState;
  handleCloseUpdateFuelType: () => void;
  handleUpdateDescription: (updatedDescription: string) => void;
  isDirty: boolean;
  fuelTypeValues: {
    description: string;
  };
}

export type {
  DashboardUpdateFuelTypeFormSubmitProps,
  DashboardUpdateFuelTypeFormState,
};
