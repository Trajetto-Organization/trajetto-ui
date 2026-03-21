import type { CommandBusinessInputValue } from "@/app/(protected)/_components/shared/common.types";

interface UpdateBusinessValidationError {
  name?: string[];
  businessId?: string[];
  updateProfileAccessErrorMessage?: string;
}

interface UpdateProfileAccessFormState {
  updateProfileAccessError?: UpdateBusinessValidationError;
  successMessage?: string;
}

interface UpdateProfileAccessFormSubmitProps {
  state: UpdateProfileAccessFormState;
  handleCloseUpdateProfileAccess: () => void;
  handleUpdateProfileAccessName: (updatedName: string) => void;
  commandBusinessInputValue: CommandBusinessInputValue;
  handleUpdateSearchBusinessInputValue: (
    businessSearchData: CommandBusinessInputValue,
  ) => void;
  profileAccessName: string;
  isDirty: boolean;
}

export type {
  UpdateProfileAccessFormSubmitProps,
  UpdateProfileAccessFormState,
};
