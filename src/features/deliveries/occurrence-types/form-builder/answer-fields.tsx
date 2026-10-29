"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldShell } from "@/components/shared/custom/field-shell";
import { DatePickerField } from "@/app/(protected)/_components/shared/custom/date-picker-field";

import type { OccurrenceFormField } from "./rules";

interface OccurrenceAnswerFieldsProps {
  fields: OccurrenceFormField[];
  /** Strings per key; "true"/"false" for sim/não (answersFromInputs types them). */
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  /** Prefix for the control ids, so two forms on a page never collide. */
  idPrefix?: string;
}

/**
 * The type's form, answered from the panel (decision 6.2): the same questions,
 * in the same order and with the same rules the driver meets in the app.
 */
const OccurrenceAnswerFields = ({
  fields,
  values,
  onChange,
  errors = {},
  disabled = false,
  idPrefix = "occurrence-answer",
}: OccurrenceAnswerFieldsProps): JSX.Element => (
  <div className="grid min-w-0 grid-cols-1 items-start gap-3 sm:grid-cols-2">
    {fields.map((field) => {
      const id = `${idPrefix}-${field.key}`;
      const label = `${field.label}${field.required ? " *" : " (opcional)"}`;
      const value = values[field.key] ?? "";
      const error = errors[field.key] ?? null;

      if (field.type === "date") {
        return (
          <DatePickerField
            key={field.key}
            label={label}
            htmlfor={id}
            // A civil day ("AAAA-MM-DD"), classified in the date-only registry.
            name="occurrence_answer_date"
            value={value}
            onChange={(next) => onChange(field.key, next)}
            errorName={error ? [error] : undefined}
            hint={field.help}
            disabled={disabled}
            allowFutureDates
            dateOnly
          />
        );
      }

      return (
        <FieldShell
          key={field.key}
          label={label}
          htmlFor={id}
          error={error}
          hint={field.help}
          className={
            field.type === "text" && field.multiline
              ? "sm:col-span-2"
              : undefined
          }
        >
          {(control) => {
            if (field.type === "boolean" || field.type === "select") {
              const options =
                field.type === "boolean"
                  ? [
                      { value: "true", label: "Sim" },
                      { value: "false", label: "Não" },
                    ]
                  : (field.options ?? []).map((option) => ({
                      value: option,
                      label: option,
                    }));

              return (
                <Select
                  value={value}
                  onValueChange={(next) => onChange(field.key, next)}
                  disabled={disabled}
                >
                  <SelectTrigger {...control} className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            }

            if (field.type === "text" && field.multiline) {
              return (
                <Textarea
                  {...control}
                  value={value}
                  maxLength={field.max_length}
                  rows={3}
                  onChange={(event) => onChange(field.key, event.target.value)}
                  disabled={disabled}
                />
              );
            }

            return (
              <Input
                {...control}
                value={value}
                inputMode={field.type === "number" ? "decimal" : undefined}
                maxLength={field.type === "text" ? field.max_length : undefined}
                onChange={(event) => onChange(field.key, event.target.value)}
                disabled={disabled}
              />
            );
          }}
        </FieldShell>
      );
    })}
  </div>
);

export { OccurrenceAnswerFields };
