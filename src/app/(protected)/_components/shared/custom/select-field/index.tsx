import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { cn } from "@/lib/utils";

import { FieldShell } from "@/components/shared/custom/field-shell";

import type { SelectFieldProps } from "../shared/common.types";

const SelectField: React.FC<SelectFieldProps> = ({
  label,
  htmlfor,
  name,
  errorName,
  value,
  onChange,
  disabled,
  placeholder,
  options,
}): JSX.Element => {
  return (
    <FieldShell label={label} htmlFor={htmlfor} error={errorName}>
      {(control) => (
        <Select
          name={name}
          value={value}
          onValueChange={onChange}
          disabled={disabled}
        >
          {/*
            The attributes go on the TRIGGER, which is the element a keyboard
            focuses and a screen reader announces. Radix forwards them through
            to the button it renders.
          */}
          <SelectTrigger
            {...control}
            className={cn(
              control["aria-invalid"] && "border-red-600 dark:border-red-500",
            )}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option, index) => (
              <SelectItem
                key={index}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </FieldShell>
  );
};

export { SelectField };
