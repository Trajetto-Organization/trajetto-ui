import { CommandProfileAccessInputValue } from "@/app/(protected)/_components/dto";

interface DashboardCreatePermissionValidationError {
  action?: string[];
  permissionKey?: string[];
  businessId?: string[];
  profileAccessId?: string[];
  canRead?: string[];
  canWrite?: string[];
  createPermissionErrorMessage?: string;
}

interface DashboardCreatePermissionFormState {
  createPermissionError?: DashboardCreatePermissionValidationError;
  successMessage?: string;
}

interface DashboardCreatePermissionContainerProps {
  state: DashboardCreatePermissionFormState;
  handleOpenCreatePermissionForm: () => void;
  handleUpdateSearchProfileAccessInputValue: ({
    profileAccessId,
    searchProfileAccessInputValue,
  }: CommandProfileAccessInputValue) => void;
  commandProfileAccessInputValue: CommandProfileAccessInputValue;
}

export type {
  DashboardCreatePermissionContainerProps,
  DashboardCreatePermissionFormState,
};
