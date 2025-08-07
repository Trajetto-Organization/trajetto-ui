import {
  CommandBusinessInputValue,
  CommandProfileAccessInputValue,
} from "../../../../dto";

interface CreatePermissionValidationError {
  action?: string[];
  permissionKey?: string[];
  businessId?: string[];
  profileAccessId?: string[];
  canRead?: string[];
  canWrite?: string[];
  createPermissionErrorMessage?: string;
}

interface CreatePermissionFormState {
  createPermissionError?: CreatePermissionValidationError;
  successMessage?: string;
}

interface CreatePermissionContainerProps {
  state: CreatePermissionFormState;
  handleOpenCreatePermissionForm: () => void;
  handleUpdateSearchBussinessInputValue: ({
    businessId,
    searchBusinessInputValue,
  }: CommandBusinessInputValue) => void;
  handleUpdateSearchProfileAccessInputValue: ({
    profileAccessId,
    searchProfileAccessInputValue,
  }: CommandProfileAccessInputValue) => void;
  commandBusinnessInputValue: CommandBusinessInputValue;
  commandProfileAccessInputValue: CommandProfileAccessInputValue;
}

export type { CreatePermissionContainerProps, CreatePermissionFormState };
