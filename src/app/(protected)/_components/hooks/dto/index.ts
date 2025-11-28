import { BusinessProps } from "../../dto";

interface UseCepValidationProps {
  initialData?: Partial<BusinessProps>;
  isOpen: boolean;
}

interface FieldProps {
  label: string;
  htmlfor: string;
  name: string;
  type: string;
  placeholder: string;
  mask?: string;
  maxLength?: number;
  disabled?: boolean;
  autoComplete?: string;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  value?: string;
}

export type { UseCepValidationProps, FieldProps };
