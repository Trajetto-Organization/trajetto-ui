import type { ReactNode } from "react";

import { parseFieldLabel } from "@/components/shared/custom/field-shell";
import { cn } from "@/lib/utils";

interface ChoiceGroupFieldProps {
  /** The group's id; the error and hint ids derive from it. */
  id: string;

  /** `"Escopos *"` marks it required, like FieldShell (decision 3.3). */
  label: string;

  error?: string | null;
  hint?: ReactNode;

  className?: string;
  children: ReactNode;
}

/**
 * A set of checkboxes with one label, one hint and one error.
 *
 * FieldShell wires a label to ONE control; a group of checkboxes has none to
 * point at. The dialogs used a `<Label htmlFor>` aimed at a `div` — a label
 * of nothing, with a grey asterisk. A fieldset and its legend are the
 * semantics a group has; the rest mirrors FieldShell: the red `*` for the
 * eye, the requirement said to a screen reader, the message under the group
 * clamped to two lines with the full text in `title` (decision 3.4).
 */
const ChoiceGroupField = ({
  id,
  label,
  error,
  hint,
  className,
  children,
}: ChoiceGroupFieldProps): JSX.Element => {
  const parsed = parseFieldLabel(label);

  const describedBy =
    [error ? `${id}-error` : null, hint ? `${id}-hint` : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <fieldset
      id={id}
      // Read by live validation's submit: the first invalid field gets the
      // focus, and inside a group that is its first option.
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy}
      data-invalid={error ? "" : undefined}
      className={cn("grid min-w-0 content-start gap-3", className)}
    >
      <legend className="mb-3 text-sm font-medium leading-none">
        {parsed.text}
        {parsed.required && (
          <>
            {" "}
            <span aria-hidden="true" className="text-red-600 dark:text-red-500">
              *
            </span>
            <span className="sr-only">(obrigatório)</span>
          </>
        )}
      </legend>

      <div className="grid content-start gap-1.5">
        {children}

        {hint && (
          <p id={`${id}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )}

        {error && (
          <p
            id={`${id}-error`}
            role="alert"
            title={error}
            className="line-clamp-2 break-words text-xs leading-4 text-destructive"
          >
            {error}
          </p>
        )}
      </div>
    </fieldset>
  );
};

export { ChoiceGroupField };
