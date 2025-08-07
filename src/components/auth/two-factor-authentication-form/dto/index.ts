interface TwoFactorValidationError {
  code?: string[];
  twoFactorErrorMessage?: string;
}

interface TwoFactorFormState {
  twoFactorError?: TwoFactorValidationError;
}

interface TwoFactorAuthenticationFormContainerProps {
  state: TwoFactorFormState;
  email: string;
}

export type { TwoFactorAuthenticationFormContainerProps, TwoFactorFormState };
