import * as React from "react";
import { Loader2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "./input";

import { Button } from "./button";

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  isLoading?: boolean;
  wrapperClassName?: string;
}

/**
 * The search box of a list, CONTROLLED by the term it is given.
 *
 * Every toolbar passes the list's term as `defaultValue` (the ListQuery's
 * params: what was typed, else the URL's). The input used to be uncontrolled,
 * so after Back or Forward the rows, the filters and the URL showed the other
 * term while the box kept the old one. Now the box shows `defaultValue`
 * whenever it changes. Typing never fights it: each keystroke reaches the
 * list query first, so the term handed back is the one just typed. A caller
 * that passes `value` controls the box itself.
 */
const SearchInputWithLoading = React.forwardRef<
  HTMLInputElement,
  SearchInputProps
>(
  (
    {
      className,
      wrapperClassName,
      isLoading,
      onChange,
      defaultValue,
      ...props
    },
    ref,
  ) => {
    const term = typeof defaultValue === "string" ? defaultValue : "";

    const [internalValue, setInternalValue] = React.useState(term);
    const internalRef = React.useRef<HTMLInputElement>(null);

    // Combine refs
    const inputRef =
      (ref as React.MutableRefObject<HTMLInputElement>) || internalRef;

    // The list's term moved (Back, Forward, a reset, another company).
    React.useEffect(() => {
      setInternalValue(term);
    }, [term]);

    const isControlledByCaller = props.value !== undefined;
    const shownValue = isControlledByCaller
      ? String(props.value ?? "")
      : internalValue;

    const showClearButton = shownValue && !isLoading;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInternalValue(e.target.value);
      onChange?.(e);
    };

    const handleClear = () => {
      setInternalValue("");

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
      <div
        className={cn("relative", wrapperClassName)}
        data-tutorial="table-search"
      >
        <Input
          ref={inputRef}
          className={cn(
            "h-8 pr-9",
            isLoading && "text-muted-foreground",
            className,
          )}
          {...props}
          value={shownValue}
          onChange={handleChange}
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
  },
);

SearchInputWithLoading.displayName = "SearchInputWithLoading";
export { SearchInputWithLoading };
