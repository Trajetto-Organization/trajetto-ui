import {
  CommandBusinessInputValue,
  CommandProfileAccessInputValue,
} from "../../../../dto";

interface CreateUserValidationError {
  email?: string[];
  name?: string[];
  password?: string[];
  role?: string[];
  businessId?: string[];
  profileAccessId?: string[];
  createUserErrorMessage?: string;
}

interface CreateUserFormState {
  createUserError?: CreateUserValidationError;
  successMessage?: string;
}

interface CreateUserContainerProps {
  state: CreateUserFormState;
  handleOpenCreateUserForm: () => void;
  handleUpdateSearchBussinessInputValue: (
    businessSearchData: CommandBusinessInputValue,
  ) => void;
  handleUpdateSearchProfileAccessInputValue: (
    profileAccessData: CommandProfileAccessInputValue,
  ) => void;
  commandBusinnessInputValue: CommandBusinessInputValue;
  commandProfileAccessInputValue: CommandProfileAccessInputValue;
}

export type { CreateUserContainerProps, CreateUserFormState };
