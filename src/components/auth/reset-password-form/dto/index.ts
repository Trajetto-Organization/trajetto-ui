interface ResetPasswordValidationError {
  password?: string[];
  confirm_password?: string[];
  resetPasswordErrorMessage?: string;
}

interface ResetPasswordFormState {
  resetPasswordError?: ResetPasswordValidationError;
  successMessage?: string;
}

interface ResetPasswordFormContainerProps {
  state: ResetPasswordFormState;
  error: string | undefined;
}

export type { ResetPasswordFormContainerProps, ResetPasswordFormState };
