import type { CommandBusinessInputValue } from "@/app/(protected)/_components/shared/common.types";
import type { FuelTypeProps } from "../fuel-type.types";

interface UpdateFuelTypeValidationError {
  description?: string[];
  businessId?: string[];
  updateFuelTypeErrorMessage?: string;
}

interface UpdateFuelTypeFormState {
  updateFuelTypeError?: UpdateFuelTypeValidationError;
  successMessage?: string;
}

interface UpdateFuelTypeFormSubmitProps {
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
  UpdateFuelTypeFormSubmitProps,
  UpdateFuelTypeFormState,
  UpdateFuelTypeFormProps,
};
