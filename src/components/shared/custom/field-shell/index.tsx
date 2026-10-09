import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * The label, the control and the error, wired together.
 *
 * Thirteen components had their own copy of this block, and every copy had the
 * same two defects.
 *
 * The first was semantic: nothing connected the message to the field it was
 * about. `aria-invalid` appeared zero times in this repository and so did
 * `aria-describedby`, which means a screen reader read the input as perfectly
 * fine and never said why the form refused to submit (WCAG 3.3.1).
 *
 * The second was worse and affected everybody, not only assistive technology:
 * the error REPLACED the label. A field that failed validation stopped saying
 * what it was, so a twelve-field address form answered with four red sentences
 * floating above four unnamed boxes. The message was also truncated to one
 * line with a hover tooltip, which a keyboard has no way to open.
 *
 * Here the label always stays, the message goes under the control, and the
 * control itself carries the wiring. `children` is a function on purpose: it
 * is what makes it impossible to use this shell and forget to thread the
 * attributes onto the field.
 */

interface FieldControlProps {
  id: string;

  /** Present only while the field is in error, as the attribute requires. */
  "aria-invalid"?: true;
  "aria-describedby"?: string;

  /** Present on required fields, so the requirement is not only a red `*`. */
  "aria-required"?: true;
}

interface FieldShellProps {
  /**
   * `"Nome *"` marks the field required, `"Nome (opcional)"` optional
   * (decision 3.3). Spacing and case are normalised here, so `"Nome*"` and
   * `"Nome (Opcional)"` render the same as the canonical spellings.
   */
  label: string;

  /** The control's id. The label points at it and the error is derived from it. */
  htmlFor: string;

  /**
   * Server-action errors arrive as a list per field (a Zod flatten); a plain
   * string is accepted for the forms that only ever produce one.
   */
  error?: string[] | string | null;

  /** Help text under the control, read out with it. */
  hint?: ReactNode;

  /** Required without a `*` in the label, for callers that know it as data. */
  required?: boolean;

  /**
   * `false` when a library owns the control's id. cmdk's Command.Input
   * overwrites any id it is given and names the input with its own hidden
   * label, so a `for` here pointed at an element that does not exist: a
   * dangling label that clicking did nothing with. The visible label stays
   * as text, and the error and hint ids still derive from `htmlFor`.
   */
  labelTargetsControl?: boolean;

  className?: string;

  children: (control: FieldControlProps) => ReactNode;
}

interface ParsedFieldLabel {
  /** The label without its marker, with `(opcional)` in lower case. */
  text: string;
  required: boolean;
}

/**
 * Splits a label into its text and its required marker.
 *
 * The old code replaced only the `*` and kept the space before it, so
 * "Destinatário *" rendered a space plus a 2px margin and "Embarcador*"
 * rendered only the margin — two spellings side by side in the same form.
 */
function parseFieldLabel(label: string): ParsedFieldLabel {
  const required = label.includes("*");

  const text = label
    .replace(/\s*\*\s*/, " ")
    .replace(/\(\s*opcional\s*\)/i, "(opcional)")
    .replace(/\s+/g, " ")
    .trim();

  return { text, required };
}

function firstMessage(error: FieldShellProps["error"]): string | null {
  if (!error) return null;
  if (typeof error === "string") return error.trim() || null;

  return error[0]?.trim() || null;
}

/**
 * The attributes the control receives, derived from what the shell knows.
 * Exported so comboboxes whose input a library owns can apply them too.
 */
function fieldControlProps({
  htmlFor,
  message,
  required,
  hasHint,
}: {
  htmlFor: string;
  message: string | null;
  required: boolean;
  hasHint: boolean;
}): FieldControlProps {
  const describedBy = [message ? `${htmlFor}-error` : null]
    .concat(hasHint ? `${htmlFor}-hint` : null)
    .filter(Boolean)
    .join(" ");

  return {
    id: htmlFor,
    ...(message ? { "aria-invalid": true as const } : {}),
    ...(describedBy ? { "aria-describedby": describedBy } : {}),
    ...(required ? { "aria-required": true as const } : {}),
  };
}

const FieldShell = ({
  label,
  htmlFor,
  error,
  hint,
  required: requiredProp = false,
  labelTargetsControl = true,
  className,
  children,
}: FieldShellProps): JSX.Element => {
  const message = firstMessage(error);
  const parsed = parseFieldLabel(label);
  const required = requiredProp || parsed.required;

  const control = fieldControlProps({
    htmlFor,
    message,
    required,
    hasHint: Boolean(hint),
  });

  return (
    /*
      `content-start` on both grids is what keeps a row level.

      A form row is a grid that stretches its items to the tallest one, and a
      grid's default `align-content` stretches its own tracks to match — so
      when one field showed an error, the field BESIDE it split the extra
      height between its label and its input and the input dropped by half
      the message's height (11px in the Criar Empresa screenshot). Packed to
      the top, the spare height goes under the field instead.
    */
    <div className={cn("relative grid content-start gap-3", className)}>
      <Label
        className="h-4 truncate"
        htmlFor={labelTargetsControl ? htmlFor : undefined}
        title={parsed.text}
      >
        {parsed.text}
        {required && (
          <>
            {" "}
            {/* The requirement is announced by `aria-required`; the star is
                for the eye only. */}
            <span aria-hidden="true" className="text-red-600 dark:text-red-400">
              *
            </span>
          </>
        )}
      </Label>

      <div className="grid content-start gap-1.5">
        {children(control)}

        {hint && (
          <p id={`${htmlFor}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )}

        {/*
          Rendered only when there is something to say. `role="alert"` is
          announced on insertion, so an always-present empty node would buy
          nothing and would cost a reserved blank row under every field of
          every dialog in the product.

          At most two lines (decision 3.4): a long message used to wrap
          without limit and push the whole form down. The full text stays in
          the DOM for a screen reader and in `title` for the pointer; clamping
          is only visual.
        */}
        {message && (
          <p
            id={`${htmlFor}-error`}
            role="alert"
            title={message}
            className="line-clamp-2 break-words text-xs leading-4 text-destructive"
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export { FieldShell, fieldControlProps, parseFieldLabel };
export type { FieldControlProps, FieldShellProps };
