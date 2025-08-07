import { CommandProfileAccessInputValue } from "@/app/(protected)/_components/dto";

interface DashboardUpdateUserValidationError {
  email?: string[];
  name?: string[];
  password?: string[];
  role?: string[];
  businessId?: string[];
  profileAccessId?: string[];
  updateUserErrorMessage?: string;
}

interface DashboardUpdateUserFormState {
  updateUserError?: DashboardUpdateUserValidationError;
  successMessage?: string;
}

interface DashboardUpdateUserContainerProps {
  state: DashboardUpdateUserFormState;
  handleUpdateUserEmail: (updatedUserName: string) => void;
  handleUpdateUserName: (updatedUserEmail: string) => void;
  handleUpdateUserRole: (updatedUserRole: string) => void;
  handleUpdateSearchProfileAccessInputValue: ({
    searchProfileAccessInputValue,
    profileAccessId,
  }: CommandProfileAccessInputValue) => void;
  handleOpenUpdateUser: () => void;
  isDirty: boolean;
  userValues: {
    userEmail: string;
    userName: string;
    userRole: string;
    commandProfileAccessInputValue: CommandProfileAccessInputValue;
  };
}

export type { DashboardUpdateUserContainerProps, DashboardUpdateUserFormState };
