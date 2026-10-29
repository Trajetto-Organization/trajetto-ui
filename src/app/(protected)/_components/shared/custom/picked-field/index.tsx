"use client";

import { X } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { FieldShell } from "@/components/shared/custom/field-shell";
import { cn } from "@/lib/utils";

interface PickedFieldProps {
  /** The field's label, as the search it replaces would show it ("Perfil de acesso *"). */
  label: string;
  htmlFor: string;
  /** The chosen record's name. */
  value: string;
  /** Accessible name of the clear button ("Remover perfil"). */
  clearLabel: string;
  onClear: () => void;
}

/**
 * A record already chosen in a search field, shown in that field's place.
 *
 * It used to be a bare 32px dashed chip ("Perfil: …") with no label: in the
 * one-column user and permission dialogs it was the only row without a label
 * and thinner than every other control. It now keeps the field's label and the
 * input height (h-10), so the row reads like the search it replaced.
 */
const PickedField = ({
  label,
  htmlFor,
  value,
  clearLabel,
  onClear,
}: PickedFieldProps) => (
  <FieldShell label={label} htmlFor={htmlFor} labelTargetsControl={false}>
    {({ id }) => (
      <div data-picked-field className="flex w-full min-w-0 items-center gap-2">
        <div
          id={id}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-10 min-w-0 flex-1 justify-start border-dashed font-normal",
          )}
        >
          <span className="truncate" title={value}>
            {value}
          </span>
        </div>

        <Button
          type="button"
          variant="ghost"
          className="h-10 w-10 shrink-0 p-0"
          aria-label={clearLabel}
          onClick={onClear}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    )}
  </FieldShell>
);

export { PickedField };
