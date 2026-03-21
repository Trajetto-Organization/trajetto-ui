import { UserLogged } from "../shared/common.types";

interface ProtectedAccountSettingsProps {
  userLogged: UserLogged;
}

interface LogOutUserState {
  logoutError?: string;
}

export type { ProtectedAccountSettingsProps, LogOutUserState };
