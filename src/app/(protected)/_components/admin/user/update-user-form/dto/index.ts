import {
  CommandBusinessInputValue,
  CommandProfileAccessInputValue,
  CommandDriverInputValue,
} from "../../../../dto";

interface UpdateUserValidationError {
  email?: string[];
  name?: string[];
  password?: string[];
  role?: string[];
  businessId?: string[];
  profileAccessId?: string[];
  driverId?: string[];
  updateUserErrorMessage?: string;
}

interface UpdateUserFormState {
  updateUserError?: UpdateUserValidationError;
  successMessage?: string;
}

interface UpdateUserContainerProps {
  state: UpdateUserFormState;
  handleUpdateUserEmail: (updatedUserName: string) => void;
  handleUpdateUserName: (updatedUserEmail: string) => void;
  handleUpdateUserRole: (updatedUserRole: string) => void;
  handleUpdateSearchBussinessInputValue: ({
    searchBusinessInputValue,
    businessId,
  }: CommandBusinessInputValue) => void;
  handleUpdateSearchProfileAccessInputValue: ({
    searchProfileAccessInputValue,
    profileAccessId,
  }: CommandProfileAccessInputValue) => void;
  handleUpdateSearchDriverInputValue: ({
    searchDriverInputValue,
    driverId,
    driverCnh,
  }: CommandDriverInputValue) => void;
  handleOpenUpdateUser: () => void;
  isDirty: boolean;
  userValues: {
    userEmail: string;
    userName: string;
    userRole: string;
    commandProfileAccessInputValue: CommandProfileAccessInputValue;
    commandBusinnessInputValue: CommandBusinessInputValue;
    commandDriverInputValue: CommandDriverInputValue;
  };
  userType: "employee" | "driver";
  setUserType: (type: "employee" | "driver") => void;
}

export type { UpdateUserFormState, UpdateUserContainerProps };
