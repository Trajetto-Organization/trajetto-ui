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

interface CreateProfileAccessFormSubmitProps {
  state: CreateProfileAccessFormState;
  handleOpenCreateProfileAccessForm: () => void;
  commandBusinessInputValue: CommandBusinessInputValue;
  handleUpdateSearchBusinessInputValue: (
    businessSearchData: CommandBusinessInputValue,
  ) => void;
}

export type {
  CreateProfileAccessFormSubmitProps,
  CreateProfileAccessFormState,
};
