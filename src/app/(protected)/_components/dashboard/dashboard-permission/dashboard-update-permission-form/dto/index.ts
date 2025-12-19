import { CommandProfileAccessInputValue } from "@/app/(protected)/_components/dto";

interface DashboardUpdatePermissionValidationError {
  action?: string[];
  businessId?: string[];
  profileAccessId?: string[];
  canRead?: string[];
  canWrite?: string[];
  permissionKey?: string[];
  updatePermissionErrorMessage?: string;
}

interface DashboardUpdatePermissionFormState {
  updatePermissionError?: DashboardUpdatePermissionValidationError;
  successMessage?: string;
}

interface DashboardUpdatePermissionFormSubmitProps {
  state: DashboardUpdatePermissionFormState;
  handleCloseUpdatePermission: () => void;
  handleUpdatePermissionName: (updatedName: string) => void;
  handleUpdatePermissionKeyName: (updatedPermissionKeyName: string) => void;
  handleUpdateCanReadPermission: (updatedCanReadPermission: boolean) => void;
  handleUpdateCanWritePermission: (updatedCanWritePermission: boolean) => void;
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
  };
}

export type {
  DashboardUpdatePermissionFormSubmitProps,
  DashboardUpdatePermissionFormState,
};
