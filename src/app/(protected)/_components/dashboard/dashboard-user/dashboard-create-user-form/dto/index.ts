import {
  CommandProfileAccessInputValue,
  CommandDriverInputValue,
} from "@/app/(protected)/_components/dto";

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

interface DashboardCreateUserContainerProps {
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

export type { DashboardCreateUserContainerProps, DashboardCreateUserFormState };
