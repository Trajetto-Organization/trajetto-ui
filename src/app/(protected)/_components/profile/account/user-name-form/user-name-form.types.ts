interface UserNameFormState {
  userNameError?: string | string[];
  successMessage?: string;
}

interface UserNameProps {
  userName: string;
  error: boolean;
}

interface UserNameFormSubmitProps {
  isUpdated: boolean;
  handleUserName: (updatedUserName: string) => void;
  userNameValue: string;
  error: boolean;
  /** The field's message (live validation), or null. */
  message: string | null;
}

interface UseUserNameForm {
  state: UserNameFormState | null;
  initialUserName: string;
  error: boolean;
}

export type {
  UserNameFormState,
  UserNameProps,
  UserNameFormSubmitProps,
  UseUserNameForm,
};
