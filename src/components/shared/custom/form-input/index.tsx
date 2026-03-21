import { Input, InputProps } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import InputMask from "react-input-mask";
import { cn } from "@/lib/utils";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FormInputProps extends Omit<InputProps, "mask"> {
  label: string;
  htmlfor: string;
  errorName?: string[];
  icon?: JSX.Element;
  mask?: string;
  beforeMaskedValueChange?: any;
  maskChar?: any;
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
  ...props
}: FormInputProps): JSX.Element => {
  const inputClassName = cn(
    "h-10 focus-visible:border-none",
    icon && "pl-10",
    props.disabled && "opacity-50 cursor-not-allowed",
    className,
  );

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
                id={htmlfor}
                className={inputClassName}
                {...inputProps}
                disabled={props.disabled}
              />
            )}
          </InputMask>
        ) : (
          <Input id={htmlfor} className={inputClassName} {...props} />
        )}
      </div>
    </div>
  );
};

export default FormInput;
