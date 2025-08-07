import { CommandBusinessInputValue } from "../../../../dto";

interface CreateProfileAccessValidationError {
  name?: string[];
  businessId?: string[];
  createProfileAccessErrorMessage?: string;
}

interface CreateProfileAccessFormState {
  createProfileAccessError?: CreateProfileAccessValidationError;
  successMessage?: string;
}

interface CreateProfileAccessContainerProps {
  state: CreateProfileAccessFormState;
  handleOpenCreateProfileAccessForm: () => void;
  commandBusinnessInputValue: CommandBusinessInputValue;
  handleUpdateSearchBussinessInputValue: (
    businessSearchData: CommandBusinessInputValue,
  ) => void;
}

export type { CreateProfileAccessContainerProps, CreateProfileAccessFormState };
