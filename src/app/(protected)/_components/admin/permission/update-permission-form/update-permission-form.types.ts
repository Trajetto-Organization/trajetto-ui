import type {
  CommandBusinessInputValue,
  CommandProfileAccessInputValue,
} from "@/app/(protected)/_components/shared/common.types";

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

interface UpdatePermissionFormSubmitProps {
  state: UpdatePermissionFormState;
  handleCloseUpdatePermission: () => void;
  handleUpdatePermissionName: (updatedName: string) => void;
  handleUpdatePermissionKeyName: (updatedPermissionKeyName: string) => void;
  handleUpdateCanReadPermission: (updatedCanReadPermission: boolean) => void;
  handleUpdateCanWritePermission: (updatedCanWritePermission: boolean) => void;
  handleUpdateSearchBusinessInputValue: ({
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
    commandBusinessInputValue: CommandBusinessInputValue;
  };
}

export type { UpdatePermissionFormSubmitProps, UpdatePermissionFormState };
