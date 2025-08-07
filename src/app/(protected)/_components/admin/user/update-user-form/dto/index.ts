import {
  CommandBusinessInputValue,
  CommandProfileAccessInputValue,
} from "../../../../dto";

interface UpdateUserValidationError {
  email?: string[];
  name?: string[];
  password?: string[];
  role?: string[];
  businessId?: string[];
  profileAccessId?: string[];
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
  handleOpenUpdateUser: () => void;
  isDirty: boolean;
  userValues: {
    userEmail: string;
    userName: string;
    userRole: string;
    commandProfileAccessInputValue: CommandProfileAccessInputValue;
    commandBusinnessInputValue: CommandBusinessInputValue;
  };
}

export type { UpdateUserFormState, UpdateUserContainerProps };
