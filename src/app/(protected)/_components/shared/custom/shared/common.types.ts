import type { ReactNode } from "react";

interface FormFieldProps {
  label: string;
  htmlfor: string;
  name: string;
  errorName?: string[];
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  allowFutureDates?: boolean;

  /** Help text under the field, read out with it. */
  hint?: ReactNode;

  /** Required without a `*` in the label. */
  required?: boolean;

  /**
   * DatePickerField only: the value is a civil day sent as `YYYY-MM-DD` and
   * read in UTC (decision 1.3), not an instant.
   */
  dateOnly?: boolean;
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
