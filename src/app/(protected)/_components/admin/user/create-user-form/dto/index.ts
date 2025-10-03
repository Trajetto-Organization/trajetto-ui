import {
  CommandBusinessInputValue,
  CommandProfileAccessInputValue,
  CommandDriverInputValue,
} from "../../../../dto";

interface CreateUserValidationError {
  email?: string[];
  name?: string[];
  password?: string[];
  role?: string[];
  businessId?: string[];
  profileAccessId?: string[];
  driverId?: string[];
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
  handleUpdateSearchDriverInputValue: (
    driverData: CommandDriverInputValue,
  ) => void;
  commandBusinnessInputValue: CommandBusinessInputValue;
  commandProfileAccessInputValue: CommandProfileAccessInputValue;
  commandDriverInputValue: CommandDriverInputValue;
  userType: "employee" | "driver";
  setUserType: (type: "employee" | "driver") => void;
}

export type { CreateUserContainerProps, CreateUserFormState };
