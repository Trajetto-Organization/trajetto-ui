interface LoginValidationError {
  email?: string[];
  password?: string[];
  loginErrorMessage?: string;
}

interface LogInFormState {
  loginError?: LoginValidationError;
  emailVerification?: string;
  twoFactor?: boolean;
  twoFactorEmail?: string;
}

interface LoginFormContainerProps {
  state: LogInFormState;
}

export type { LoginFormContainerProps, LogInFormState };
