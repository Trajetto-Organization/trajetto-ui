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
 * Here the label always stays, the message goes under the control and wraps,
 * and the control itself carries the wiring. `children` is a function on
 * purpose: it is what makes it impossible to use this shell and forget to
 * thread the attributes onto the field.
 */

interface FieldControlProps {
  id: string;

  /** Present only while the field is in error, as the attribute requires. */
  "aria-invalid"?: true;
  "aria-describedby"?: string;
}

interface FieldShellProps {
  /** A trailing `*` is rendered as the required marker. */
  label: string;

  /** The control's id. The label points at it and the error is derived from it. */
  htmlFor: string;

  /**
   * Server-action errors arrive as a list per field (a Zod flatten); a plain
   * string is accepted for the forms that only ever produce one.
   */
  error?: string[] | string | null;

  className?: string;

  children: (control: FieldControlProps) => ReactNode;
}

function firstMessage(error: FieldShellProps["error"]): string | null {
  if (!error) return null;
  if (typeof error === "string") return error.trim() || null;

  return error[0]?.trim() || null;
}

const FieldShell = ({
  label,
  htmlFor,
  error,
  className,
  children,
}: FieldShellProps): JSX.Element => {
  const message = firstMessage(error);
  const errorId = `${htmlFor}-error`;

  const control: FieldControlProps = {
    id: htmlFor,
    ...(message ? { "aria-invalid": true, "aria-describedby": errorId } : {}),
  };

  const required = label.includes("*");

  return (
    <div className={cn("grid gap-3 relative", className)}>
      <Label className="h-4 truncate" htmlFor={htmlFor}>
        {required ? (
          <>
            {label.replace("*", "")}
            <span className="text-red-600 dark:text-red-500 ml-0.5">*</span>
          </>
        ) : (
          label
        )}
      </Label>

      <div className="grid gap-1.5">
        {children(control)}

        {/*
          Rendered only when there is something to say. `role="alert"` is
          announced on insertion, so an always-present empty node would buy
          nothing and would cost a reserved blank row under every field of
          every dialog in the product.

          It wraps instead of truncating: a message the user cannot finish
          reading is a message that does not tell them how to fix anything,
          and the tooltip this replaced only opened on hover.
        */}
        {message && (
          <p
            id={errorId}
            role="alert"
            className="text-xs leading-4 text-red-600 dark:text-red-500 break-words"
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export { FieldShell };
export type { FieldControlProps, FieldShellProps };
