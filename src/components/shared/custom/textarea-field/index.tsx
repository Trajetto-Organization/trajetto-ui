import type { ComponentProps, ReactNode } from "react";

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { FieldShell } from "@/components/shared/custom/field-shell";

/**
 * A multi-line field with the same label, error and aria wiring as FormInput.
 *
 * Four copies of the service-order description, the cancel-route reason and
 * a few others hand-built a `<Label>` over a `<Textarea>`, with the old
 * "error replaces the label" pattern and no `aria-invalid`. This is the
 * FieldShell for them (decisions 3.3 and 3.4).
 */
interface TextareaFieldProps extends ComponentProps<"textarea"> {
  label: string;
  htmlfor: string;
  errorName?: string[] | string | null;
  hint?: ReactNode;
}

const TextareaField = ({
  label,
  htmlfor,
  errorName,
  hint,
  className,
  ...props
}: TextareaFieldProps): JSX.Element => (
  <FieldShell
    label={label}
    htmlFor={htmlfor}
    error={errorName}
    hint={hint}
    required={props.required}
  >
    {(control) => (
      <Textarea
        {...props}
        {...control}
        className={cn(
          control["aria-invalid"] && "border-red-600 dark:border-red-500",
          className,
        )}
      />
    )}
  </FieldShell>
);

export { TextareaField };
export type { TextareaFieldProps };
