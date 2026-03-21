import type {
  CommandBusinessInputValue,
  CommandProfileAccessInputValue,
  CommandDriverInputValue,
} from "@/app/(protected)/_components/shared/common.types";

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

interface CreateUserFormSubmitProps {
  state: CreateUserFormState;
  handleOpenCreateUserForm: () => void;
  handleUpdateSearchBusinessInputValue: (
    businessSearchData: CommandBusinessInputValue,
  ) => void;
  handleUpdateSearchProfileAccessInputValue: (
    profileAccessData: CommandProfileAccessInputValue,
  ) => void;
  handleUpdateSearchDriverInputValue: (
    driverData: CommandDriverInputValue,
  ) => void;
  commandBusinessInputValue: CommandBusinessInputValue;
  commandProfileAccessInputValue: CommandProfileAccessInputValue;
  commandDriverInputValue: CommandDriverInputValue;
  userType: "employee" | "driver";
  setUserType: (type: "employee" | "driver") => void;
}

export type { CreateUserFormSubmitProps, CreateUserFormState };
