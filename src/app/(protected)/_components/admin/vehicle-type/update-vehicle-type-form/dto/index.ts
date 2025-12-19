import { CommandBusinessInputValue } from "../../../../dto";

interface UpdateVehicleTypeValidationError {
  description?: string[];
  number_of_axles?: string[];
  businessId?: string[];
  updateVehicleTypeErrorMessage?: string;
}

interface UpdateVehicleTypeFormState {
  updateVehicleTypeError?: UpdateVehicleTypeValidationError;
  successMessage?: string;
}

interface UpdateVehicleTypeFormSubmitProps {
  state: UpdateVehicleTypeFormState;
  handleCloseUpdateVehicleType: () => void;
  handleUpdateDescription: (updatedDescription: string) => void;
  handleUpdateNumberOfAxles: (updatedNumberOfAxles: string) => void;
  isDirty: boolean;
  vehicleTypeValues: {
    number_of_axles: number;
    description: string;
  };
  commandBusinessInputValue: CommandBusinessInputValue;
  handleUpdateSearchBusinessInputValue: (
    data: CommandBusinessInputValue,
  ) => void;
}

export type { UpdateVehicleTypeFormSubmitProps, UpdateVehicleTypeFormState };
