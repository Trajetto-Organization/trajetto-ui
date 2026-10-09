import type { ReactNode } from "react";

import { Input, InputProps } from "@/components/ui/input";

import InputMask from "react-input-mask";
import { cn } from "@/lib/utils";

import { FieldShell } from "@/components/shared/custom/field-shell";

interface FormInputProps extends Omit<InputProps, "mask"> {
  label: string;
  htmlfor: string;
  errorName?: string[];
  icon?: JSX.Element;
  mask?: string;
  beforeMaskedValueChange?: any;
  maskChar?: any;

  /** Help text under the field, included in its `aria-describedby`. */
  hint?: ReactNode;
}

const FormInput = ({
  label,
  htmlfor,
  errorName,
  icon,
  mask,
  className,
  beforeMaskedValueChange,
  maskChar,
  hint,
  ...props
}: FormInputProps): JSX.Element => {
  // No `focus-visible:border-none`: it removed the red error border exactly
  // while the person was focused on fixing the field.
  const inputClassName = cn(
    "h-10",
    icon && "pl-10",
    props.disabled && "opacity-50 cursor-not-allowed",
    className,
  );

  return (
    <FieldShell
      label={label}
      htmlFor={htmlfor}
      error={errorName}
      hint={hint}
      required={props.required}
    >
      {(control) => (
        <div className="relative">
          {icon && (
            <div
              className="absolute inset-y-0 left-0 pl-3
            flex items-center pointer-events-none"
            >
              {icon}
            </div>
          )}
          {mask ? (
            <InputMask
              mask={mask}
              maskChar={null}
              beforeMaskedValueChange={beforeMaskedValueChange}
              {...props}
            >
              {(inputProps: any) => (
                <Input
                  className={cn(
                    inputClassName,
                    control["aria-invalid"] &&
                      "border-red-600 dark:border-red-500",
                  )}
                  {...inputProps}
                  {...control}
                  disabled={props.disabled}
                />
              )}
            </InputMask>
          ) : (
            <Input
              className={cn(
                inputClassName,
                control["aria-invalid"] && "border-red-600 dark:border-red-500",
              )}
              {...props}
              {...control}
            />
          )}
        </div>
      )}
    </FieldShell>
  );
};

export default FormInput;
