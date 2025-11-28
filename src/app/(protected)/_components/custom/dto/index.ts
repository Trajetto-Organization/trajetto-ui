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
}

interface SelectFieldProps extends FormFieldProps {
  options: SelectOption[];
  placeholder: string;
}

interface DatePickerProps {
  value?: string;
  onChange?: (value: string) => void;
}

export type { SelectFieldProps, FormFieldProps, DatePickerProps };
