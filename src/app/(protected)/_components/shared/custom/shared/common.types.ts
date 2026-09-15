interface FormFieldProps {
  label: string;
  htmlfor: string;
  name: string;
  errorName?: string[];
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  allowFutureDates?: boolean;
}

interface SelectOption {
  value: string;
  label: string;

  /**
   * Shown but not choosable. For a value the system owns rather than the
   * user: the field still displays the truth instead of going blank, and the
   * option cannot be picked.
   */
  disabled?: boolean;
}

interface SelectFieldProps extends FormFieldProps {
  options: SelectOption[];
  placeholder: string;
}

export type { SelectFieldProps, SelectOption, FormFieldProps };
