import { CommandBusinessInputValue } from "../../../../dto";

interface CreateFuelTypeValidationError {
  description?: string[];
  businessId?: string[];
  createFuelTypeErrorMessage?: string;
}

interface CreateFuelTypeFormState {
  createFuelTypeError?: CreateFuelTypeValidationError;
  successMessage?: string;
}

interface CreateFuelTypeContainerProps {
  state: CreateFuelTypeFormState;
  handleOpenCreateFuelTypeForm: () => void;
  handleUpdateSearchBussinessInputValue: ({
    searchBusinessInputValue,
  }: CommandBusinessInputValue) => void;
  commandBusinnessInputValue: CommandBusinessInputValue;
}

export type { CreateFuelTypeContainerProps, CreateFuelTypeFormState };
