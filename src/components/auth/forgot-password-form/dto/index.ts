interface ForgotPasswordValidationError {
  email?: string[];
  forgotPasswordErrorMessage?: string;
}

interface ForgotPasswordFormState {
  forgotPasswordError?: ForgotPasswordValidationError;
  successMessage?: string;
}

interface ForgotPasswordContainerProps {
  state: ForgotPasswordFormState;
}

export type { ForgotPasswordContainerProps, ForgotPasswordFormState };
