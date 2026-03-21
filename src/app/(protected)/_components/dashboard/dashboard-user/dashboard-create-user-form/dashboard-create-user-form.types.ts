import type {
  CommandProfileAccessInputValue,
  CommandDriverInputValue,
} from "@/app/(protected)/_components/shared/common.types";

interface DashboardCreateUserValidationError {
  email?: string[];
  name?: string[];
  password?: string[];
  role?: string[];
  businessId?: string[];
  profileAccessId?: string[];
  driverId?: string[];
  createUserErrorMessage?: string;
}

interface DashboardCreateUserFormState {
  createUserError?: DashboardCreateUserValidationError;
  successMessage?: string;
}

interface DashboardCreateUserFormSubmitProps {
  state: DashboardCreateUserFormState;
  handleOpenCreateUserForm: () => void;
  handleUpdateSearchProfileAccessInputValue: (
    profileAccessData: CommandProfileAccessInputValue,
  ) => void;
  handleUpdateSearchDriverInputValue: (
    driverData: CommandDriverInputValue,
  ) => void;
  commandProfileAccessInputValue: CommandProfileAccessInputValue;
  commandDriverInputValue: CommandDriverInputValue;
  userType: "employee" | "driver";
  setUserType: (type: "employee" | "driver") => void;
}

export type {
  DashboardCreateUserFormSubmitProps,
  DashboardCreateUserFormState,
};
