import { CommandBusinessInputValue } from "../../../../dto";
import { FuelTypeProps } from "../../dto";

interface UpdateFuelTypeValidationError {
  description?: string[];
  businessId?: string[];
  updateFuelTypeErrorMessage?: string;
}

interface UpdateFuelTypeFormState {
  updateFuelTypeError?: UpdateFuelTypeValidationError;
  successMessage?: string;
}

interface UpdateFuelTypeContainerProps {
  state: UpdateFuelTypeFormState;
  handleCloseUpdateFuelType: () => void;
  handleUpdateDescription: (updatedDescription: string) => void;
  isDirty: boolean;
  fuelTypeValues: {
    description: string;
  };
  commandBusinessInputValue: CommandBusinessInputValue;
  handleUpdateSearchBusinessInputValue: (
    data: CommandBusinessInputValue,
  ) => void;
}

interface UpdateFuelTypeFormProps {
  fuelTypeData: FuelTypeProps;
  handleCloseUpdateFuelType: () => void;
  isUpdateFuelTypeOpen: boolean;
}

export type {
  UpdateFuelTypeContainerProps,
  UpdateFuelTypeFormState,
  UpdateFuelTypeFormProps,
};
