"use client";

import { useId } from "react";

import { FieldShell } from "@/components/shared/custom/field-shell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { BRAZILIAN_TIME_ZONE_OPTIONS } from "./timezones";

interface BusinessTimeZoneFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string[] | string;
  disabled?: boolean;
}

/**
 * The company's time zone (decision 1.1): every "hoje" and daily bucket of
 * the company is counted on this clock. Brazilian zones only, labelled by
 * the states they cover. The value travels in a hidden input named
 * `timezone`, so the form action reads it like any other field.
 */
const BusinessTimeZoneField = ({
  value,
  onChange,
  error,
  disabled,
}: BusinessTimeZoneFieldProps): JSX.Element => {
  const fieldId = useId();

  return (
    <FieldShell
      label="Fuso horário *"
      htmlFor={fieldId}
      error={error}
      hint="Define o dia dos painéis e relatórios da empresa."
    >
      {(control) => (
        <>
          <Select value={value} onValueChange={onChange} disabled={disabled}>
            <SelectTrigger {...control} className="w-full">
              <SelectValue placeholder="Selecione o fuso horário" />
            </SelectTrigger>
            <SelectContent>
              {BRAZILIAN_TIME_ZONE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <input type="hidden" name="timezone" value={value} />
        </>
      )}
    </FieldShell>
  );
};

export { BusinessTimeZoneField };
