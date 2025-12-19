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

interface CreatePermissionFormSubmitProps {
  state: CreatePermissionFormState;
  handleOpenCreatePermissionForm: () => void;
  handleUpdateSearchBusinessInputValue: ({
    businessId,
    searchBusinessInputValue,
  }: CommandBusinessInputValue) => void;
  handleUpdateSearchProfileAccessInputValue: ({
    profileAccessId,
    searchProfileAccessInputValue,
  }: CommandProfileAccessInputValue) => void;
  commandBusinessInputValue: CommandBusinessInputValue;
  commandProfileAccessInputValue: CommandProfileAccessInputValue;
}

export type { CreatePermissionFormSubmitProps, CreatePermissionFormState };
