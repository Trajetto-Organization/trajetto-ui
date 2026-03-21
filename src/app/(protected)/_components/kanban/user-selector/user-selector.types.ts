interface UserSelectorProps {
  businessId: string;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  errorMessage?: string[];
}

export type { UserSelectorProps };
