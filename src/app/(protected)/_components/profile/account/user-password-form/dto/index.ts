interface UpdateUserPasswordValidationError {
  current_password?: string[];
  new_password?: string[];
  confirm_new_password?: string[];
  userPasswordErrorMessage?: string;
}

interface UpdateUserPasswordFormState {
  userPasswordError?: UpdateUserPasswordValidationError;
  successMessage?: string;
}

interface UpdateUserPasswordFormSubmitProps {
  state: UpdateUserPasswordFormState;
  error: boolean;
}

interface UpdatePasswordProps {
  error: boolean;
}

export type {
  UpdateUserPasswordFormSubmitProps,
  UpdateUserPasswordFormState,
  UpdatePasswordProps,
};
