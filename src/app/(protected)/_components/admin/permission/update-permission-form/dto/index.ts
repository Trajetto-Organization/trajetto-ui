import {
  CommandBusinessInputValue,
  CommandProfileAccessInputValue,
} from "../../../../dto";

interface UpdatePermissionValidationError {
  action?: string[];
  businessId?: string[];
  profileAccessId?: string[];
  canRead?: string[];
  canWrite?: string[];
  permissionKey?: string[];
  updatePermissionErrorMessage?: string;
}

interface UpdatePermissionFormState {
  updatePermissionError?: UpdatePermissionValidationError;
  successMessage?: string;
}

interface UpdatePermissionContainerProps {
  state: UpdatePermissionFormState;
  handleCloseUpdatePermission: () => void;
  handleUpdatePermissionName: (updatedName: string) => void;
  handleUpdatePermissionKeyName: (updatedPermissionKeyName: string) => void;
  handleUpdateCanReadPermission: (updatedCanReadPermission: boolean) => void;
  handleUpdateCanWritePermission: (updatedCanWritePermission: boolean) => void;
  handleUpdateSearchBussinessInputValue: ({
    searchBusinessInputValue,
    businessId,
  }: CommandBusinessInputValue) => void;
  handleUpdateSearchProfileAccessInputValue: ({
    searchProfileAccessInputValue,
    profileAccessId,
  }: CommandProfileAccessInputValue) => void;
  isDirty: boolean;
  permissionValues: {
    permissionName: string;
    permissionKeyName: string;
    canRead: boolean;
    canWrite: boolean;
    commandProfileAccessInputValue: CommandProfileAccessInputValue;
    commandBusinnessInputValue: CommandBusinessInputValue;
  };
}

export type { UpdatePermissionContainerProps, UpdatePermissionFormState };
