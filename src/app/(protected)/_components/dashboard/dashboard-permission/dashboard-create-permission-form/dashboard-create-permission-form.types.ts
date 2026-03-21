import type { CommandProfileAccessInputValue } from "@/app/(protected)/_components/shared/common.types";

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

interface DashboardCreatePermissionFormSubmitProps {
  state: DashboardCreatePermissionFormState;
  handleOpenCreatePermissionForm: () => void;
  handleUpdateSearchProfileAccessInputValue: ({
    profileAccessId,
    searchProfileAccessInputValue,
  }: CommandProfileAccessInputValue) => void;
  commandProfileAccessInputValue: CommandProfileAccessInputValue;
}

export type {
  DashboardCreatePermissionFormSubmitProps,
  DashboardCreatePermissionFormState,
};
