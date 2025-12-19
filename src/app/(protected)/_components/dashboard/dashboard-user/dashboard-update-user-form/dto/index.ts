import {
  CommandProfileAccessInputValue,
  CommandDriverInputValue,
} from "@/app/(protected)/_components/dto";

interface DashboardUpdateUserValidationError {
  email?: string[];
  name?: string[];
  password?: string[];
  role?: string[];
  businessId?: string[];
  profileAccessId?: string[];
  driverId?: string[];
  updateUserErrorMessage?: string;
}

interface DashboardUpdateUserFormState {
  updateUserError?: DashboardUpdateUserValidationError;
  successMessage?: string;
}

interface DashboardUpdateUserFormSubmitProps {
  state: DashboardUpdateUserFormState;
  handleUpdateUserEmail: (updatedUserName: string) => void;
  handleUpdateUserName: (updatedUserEmail: string) => void;
  handleUpdateUserRole: (updatedUserRole: string) => void;
  handleUpdateSearchProfileAccessInputValue: ({
    searchProfileAccessInputValue,
    profileAccessId,
  }: CommandProfileAccessInputValue) => void;
  handleUpdateSearchDriverInputValue: ({
    searchDriverInputValue,
    driverId,
    driverCnh,
  }: CommandDriverInputValue) => void;
  handleOpenUpdateUser: () => void;
  isDirty: boolean;
  userValues: {
    userEmail: string;
    userName: string;
    userRole: string;
    commandProfileAccessInputValue: CommandProfileAccessInputValue;
    commandDriverInputValue: CommandDriverInputValue;
  };
  userType: "employee" | "driver";
  setUserType: (type: "employee" | "driver") => void;
}

export type {
  DashboardUpdateUserFormSubmitProps,
  DashboardUpdateUserFormState,
};
