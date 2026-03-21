import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { cn } from "@/lib/utils";
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
    <div className="grid gap-3 relative">
      {errorName ? (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Label
                className={cn("h-4 truncate text-red-500")}
                htmlFor={htmlfor}
              >
                {errorName[0]}
              </Label>
            </TooltipTrigger>
            <TooltipContent
              align="start"
              className="max-w-[300px] 
              whitespace-normal break-words p-2"
            >
              {errorName[0]}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <Label className="h-4 truncate" htmlFor={htmlfor}>
          {label.includes("*") ? (
            <>
              {label.replace("*", "")}
              <span className="text-red-500 ml-0.5">*</span>
            </>
          ) : (
            label
          )}
        </Label>
      )}

      <Select
        name={name}
        value={value}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger id={htmlfor}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option, index) => (
            <SelectItem key={index} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export { SelectField };
