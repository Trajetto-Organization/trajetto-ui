interface DashboardUpdateVehicleTypeValidationError {
  description?: string[];
  number_of_axles?: string[];
  businessId?: string[];
  updateVehicleTypeErrorMessage?: string;
}

interface DashboardUpdateVehicleTypeFormState {
  updateVehicleTypeError?: DashboardUpdateVehicleTypeValidationError;
  successMessage?: string;
}

interface DashboardUpdateVehicleTypeFormSubmitProps {
  state: DashboardUpdateVehicleTypeFormState;
  handleCloseUpdateVehicleType: () => void;
  handleUpdateDescription: (updatedDescription: string) => void;
  handleUpdateNumberOfAxles: (updatedNumberOfAxles: string) => void;
  isDirty: boolean;
  vehicleTypeValues: {
    number_of_axles: number;
    description: string;
  };
}

export type {
  DashboardUpdateVehicleTypeFormSubmitProps,
  DashboardUpdateVehicleTypeFormState,
};
