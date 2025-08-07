import { CommandProfileAccessInputValue } from "@/app/(protected)/_components/dto";

interface DashboardCreateUserValidationError {
  email?: string[];
  name?: string[];
  password?: string[];
  role?: string[];
  businessId?: string[];
  profileAccessId?: string[];
  createUserErrorMessage?: string;
}

interface DashboardCreateUserFormState {
  createUserError?: DashboardCreateUserValidationError;
  successMessage?: string;
}

interface DashboardCreateUserContainerProps {
  state: DashboardCreateUserFormState;
  handleOpenCreateUserForm: () => void;
  handleUpdateSearchProfileAccessInputValue: (
    profileAccessData: CommandProfileAccessInputValue,
  ) => void;
  commandProfileAccessInputValue: CommandProfileAccessInputValue;
}

export type { DashboardCreateUserContainerProps, DashboardCreateUserFormState };
