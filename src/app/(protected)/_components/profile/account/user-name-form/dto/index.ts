interface UserNameFormState {
  userNameError?: string | string[];
  successMessage?: string;
}

interface UserNameProps {
  userName: string;
  error: boolean;
}

interface UserNameContainerProps {
  isUpdated: boolean;
  handleUserName: (updatedUserName: string) => void;
  userNameValue: string;
  error: boolean;
}

interface UseUserNameForm {
  state: UserNameFormState | null;
  initialUserName: string;
  error: boolean;
}

export type {
  UserNameFormState,
  UserNameProps,
  UserNameContainerProps,
  UseUserNameForm,
};
