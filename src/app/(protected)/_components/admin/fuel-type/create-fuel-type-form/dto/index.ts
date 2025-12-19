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

interface CreateFuelTypeFormSubmitProps {
  state: CreateFuelTypeFormState;
  handleOpenCreateFuelTypeForm: () => void;
  handleUpdateSearchBussinessInputValue: ({
    searchBusinessInputValue,
  }: CommandBusinessInputValue) => void;
  commandBusinnessInputValue: CommandBusinessInputValue;
}

export type { CreateFuelTypeFormSubmitProps, CreateFuelTypeFormState };
