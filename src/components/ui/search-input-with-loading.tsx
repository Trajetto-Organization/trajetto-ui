import * as React from "react";
import { Loader2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "./input";

import { Button } from "./button";

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  isLoading?: boolean;
  wrapperClassName?: string;
}

const SearchInputWithLoading = React.forwardRef<
  HTMLInputElement,
  SearchInputProps
>(({ className, wrapperClassName, isLoading, onChange, ...props }, ref) => {
  const [internalValue, setInternalValue] = React.useState(
    (props.defaultValue as string) || "",
  );
  const internalRef = React.useRef<HTMLInputElement>(null);

  // Combine refs
  const inputRef =
    (ref as React.MutableRefObject<HTMLInputElement>) || internalRef;

  // Sync internal value with defaultValue prop
  React.useEffect(() => {
    const defaultVal = (props.defaultValue as string) || "";
    setInternalValue(defaultVal);
  }, [props.defaultValue]);

  const showClearButton = internalValue && !isLoading;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInternalValue(e.target.value);
    onChange?.(e);
  };

  const handleClear = () => {
    setInternalValue("");

    // Clear the input value directly
    if (inputRef.current) {
      inputRef.current.value = "";
    }

    // Trigger onChange with empty value
    if (onChange) {
      const event = {
        target: { value: "" },
        currentTarget: { value: "" },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(event);
    }
  };

  return (
    <div className={cn("relative", wrapperClassName)}>
      <Input
        ref={inputRef}
        className={cn(
          "h-8 pr-9",
          isLoading && "text-muted-foreground",
          className,
        )}
        onChange={handleChange}
        {...props}
        id={props.id || "search-input"}
        name={props.name || "search"}
      />
      {isLoading && (
        <div
          className="absolute right-3 top-1/2
          -translate-y-1/2 pointer-events-none"
        >
          <Loader2
            className="h-4 w-4 animate-spin
            text-muted-foreground"
          />
        </div>
      )}
      {showClearButton && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2
          transform -translate-y-1/2 h-6 w-6"
          onClick={handleClear}
          type="button"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
});

SearchInputWithLoading.displayName = "SearchInputWithLoading";
export { SearchInputWithLoading };
