import { CommandBusinessInputValue } from "../../../../dto";

interface CreateVehicleTypeValidationError {
  description?: string[];
  number_of_axles?: string[];
  businessId?: string[];
  createVehicleTypeErrorMessage?: string;
}

interface CreateVehicleTypeFormState {
  createVehicleTypeError?: CreateVehicleTypeValidationError;
  successMessage?: string;
}

interface CreateVehicleTypeFormSubmitProps {
  state: CreateVehicleTypeFormState;
  handleOpenCreateVehicleTypeForm: () => void;
  handleUpdateSearchBussinessInputValue: ({
    searchBusinessInputValue,
  }: CommandBusinessInputValue) => void;
  commandBusinnessInputValue: CommandBusinessInputValue;
}

export type { CreateVehicleTypeFormSubmitProps, CreateVehicleTypeFormState };
