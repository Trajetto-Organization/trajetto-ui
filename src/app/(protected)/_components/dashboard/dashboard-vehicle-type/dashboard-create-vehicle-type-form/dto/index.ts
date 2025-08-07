interface DashboardCreateVehicleTypeValidationError {
  description?: string[];
  number_of_axles?: string[];
  businessId?: string[];
  createVehicleTypeErrorMessage?: string;
}

interface DashboardCreateVehicleTypeFormState {
  createVehicleTypeError?: DashboardCreateVehicleTypeValidationError;
  successMessage?: string;
}

interface DashboardCreateVehicleTypeContainerProps {
  state: DashboardCreateVehicleTypeFormState;
  handleOpenCreateVehicleTypeForm: () => void;
}

export type {
  DashboardCreateVehicleTypeContainerProps,
  DashboardCreateVehicleTypeFormState,
};
