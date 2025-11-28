interface UserTwoFactorFormState {
  twoFactorAuthenticationError?: string;
  successMessage?: string;
}

interface UserTwoFactorAuthenticationFormProps {
  error: boolean;
  isTwoFactorEnabled: boolean;
}

export type { UserTwoFactorFormState, UserTwoFactorAuthenticationFormProps };
