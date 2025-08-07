import { CommandBusinessInputValue } from "../../../../dto";

interface UpdateBusinessValidationError {
  name?: string[];
  businessId?: string[];
  updateProfileAccessErrorMessage?: string;
}

interface UpdateProfileAccessFormState {
  updateProfileAccessError?: UpdateBusinessValidationError;
  successMessage?: string;
}

interface UpdateProfileAccessContainerProps {
  state: UpdateProfileAccessFormState;
  handleCloseUpdateProfileAccess: () => void;
  handleUpdateProfileAccessName: (updatedName: string) => void;
  commandBusinnessInputValue: CommandBusinessInputValue;
  handleUpdateSearchBussinessInputValue: (
    businessSearchData: CommandBusinessInputValue,
  ) => void;
  profileAccessName: string;
  isDirty: boolean;
}

export type { UpdateProfileAccessContainerProps, UpdateProfileAccessFormState };
