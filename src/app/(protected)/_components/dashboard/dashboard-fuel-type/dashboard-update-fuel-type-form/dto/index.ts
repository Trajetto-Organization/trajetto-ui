interface DashboardUpdateFuelTypeValidationError {
  description?: string[];
  businessId?: string[];
  updateFuelTypeErrorMessage?: string;
}

interface DashboardUpdateFuelTypeFormState {
  updateFuelTypeError?: DashboardUpdateFuelTypeValidationError;
  successMessage?: string;
}

interface DashboardUpdateFuelTypeContainerProps {
  state: DashboardUpdateFuelTypeFormState;
  handleCloseUpdateFuelType: () => void;
  handleUpdateDescription: (updatedDescription: string) => void;
  isDirty: boolean;
  fuelTypeValues: {
    description: string;
  };
}

export type {
  DashboardUpdateFuelTypeContainerProps,
  DashboardUpdateFuelTypeFormState,
};
