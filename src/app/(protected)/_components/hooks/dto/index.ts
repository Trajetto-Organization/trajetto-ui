import { BusinessProps } from "../../dto";

interface UseCepValidationProps {
  /** Values to initialize the form (may include persisted values from step navigation) */
  initialData?: Partial<BusinessProps>;
  /** Whether the dialog is open */
  isOpen: boolean;
  /**
   * Original data from database for isDirty calculation.
   * Use this in multi-step forms where initialData may include persisted values.
   * If not provided, initialData is used for isDirty comparison.
   */
  originalData?: Partial<BusinessProps>;
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
