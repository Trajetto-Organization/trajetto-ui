"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button, buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";

import { cn } from "@/lib/utils";

import { FieldShell } from "@/components/shared/custom/field-shell";

import {
  HOURS,
  formatLocalDateTime,
  localPartsFromIso,
  minuteOptions,
  pad,
  parseTimeOfDay,
  toIsoFromLocalParts,
  type LocalDateTimeParts,
} from "./helpers";

interface DateTimePickerFieldBaseProps {
  label: string;
  htmlfor: string;

  /** Carries the ISO value into the form's FormData. */
  name: string;

  errorName?: string[];

  disabled?: boolean;
  hint?: ReactNode;
  required?: boolean;

  /** First and last choosable days (e.g. the route's own day). */
  fromDate?: Date;
  toDate?: Date;

  /** Minute granularity of the time select. */
  minuteStep?: number;

  /**
   * The time given to a day picked before any time was — shown on the field
   * right away, so nothing is filled in behind the person's back.
   */
  defaultTime?: string;
}

/**
 * Controlled or not, never half of each.
 *
 * The native input it replaces was uncontrolled (`name` + `defaultValue`
 * in a server-action form). A `value` with no `onChange` would freeze the
 * field, and an `onChange`-only field with no state of its own showed
 * nothing after a pick and posted an empty value — so the type allows the
 * two coherent shapes only.
 */
type DateTimePickerFieldProps = DateTimePickerFieldBaseProps &
  (
    | {
        /** ISO instant with offset, or "" for none. */
        value: string;
        onChange: (value: string) => void;
        defaultValue?: never;
      }
    | {
        value?: undefined;

        /** The starting ISO instant; the field keeps its own state after. */
        defaultValue?: string;

        /** Told of every change, for a caller that only needs to watch. */
        onChange?: (value: string) => void;
      }
  );

/** Midnight of a day on the local clock. */
const localDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

/**
 * Date and time in one field, replacing the native `datetime-local`
 * (decision 1.4).
 *
 * The native input put its calendar glyph right after "--:--" in the middle of
 * the box, had a text cursor, looked like nothing else in the product and
 * produced a string without an offset. This is the DatePickerField's trigger —
 * calendar icon at the end, pointer cursor, FieldShell for label, error and
 * aria — opening a calendar with hour and minute selects under it, and it
 * emits `toISOString()` of the local moment.
 */
const DateTimePickerField = ({
  label,
  htmlfor,
  name,
  errorName,
  value,
  defaultValue,
  onChange,
  disabled = false,
  hint,
  required,
  fromDate,
  toDate,
  minuteStep = 5,
  defaultTime = "08:00",
}: DateTimePickerFieldProps): JSX.Element => {
  const [open, setOpen] = useState(false);

  const controlled = value !== undefined;
  const [own, setOwn] = useState(defaultValue ?? "");
  const current = controlled ? value : own;

  const parts = useMemo(() => localPartsFromIso(current), [current]);

  const minutes = useMemo(
    () => minuteOptions(minuteStep, parts?.minute),
    [minuteStep, parts?.minute],
  );

  const emit = (next: LocalDateTimeParts | null): void => {
    const iso = next ? toIsoFromLocalParts(next) : "";

    if (!controlled) setOwn(iso);

    onChange?.(iso);
  };

  // A time picked before a day lands on the first choosable day (the
  // route's own, when the caller bounds it), otherwise today.
  const baseParts = (): LocalDateTimeParts =>
    parts ?? {
      date: localDay(fromDate ?? new Date()),
      ...parseTimeOfDay(defaultTime),
    };

  const handleDay = (day: Date | undefined): void => {
    if (!day) return;

    // A day picked first gets the default time, visibly, instead of waiting
    // in a half-filled state the form cannot submit.
    const time = parts ?? parseTimeOfDay(defaultTime);

    emit({ date: day, hour: time.hour, minute: time.minute });
  };

  const handleHour = (hour: string): void => {
    emit({ ...baseParts(), hour: Number(hour) });
  };

  const handleMinute = (minute: string): void => {
    emit({ ...baseParts(), minute: Number(minute) });
  };

  const formatted = formatLocalDateTime(parts);

  return (
    <FieldShell
      label={label}
      htmlFor={htmlfor}
      error={errorName}
      hint={hint}
      required={required}
    >
      {(control) => (
        <>
          {/*
            What is posted is what is shown: a value the field cannot read
            (a legacy `datetime-local` string without offset) goes out
            empty rather than as a time the API refuses (decision 1.4).
          */}
          <input type="hidden" name={name} value={parts ? current : ""} />

          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              {/* A combobox for the same reason as DatePickerField's:
                  `aria-required` is only allowed on a role that takes a
                  value. */}
              <Button
                {...control}
                role="combobox"
                type="button"
                variant="outline"
                disabled={disabled}
                className={cn(
                  "w-full cursor-pointer justify-between gap-2 text-left font-normal",
                  !formatted && "text-muted-foreground",
                  disabled && "cursor-not-allowed opacity-50",
                  control["aria-invalid"] &&
                    "border-red-600 dark:border-red-500",
                )}
              >
                <span className="min-w-0 truncate">
                  {formatted || "Selecione data e hora"}
                </span>
                <CalendarIcon
                  className="h-4 w-4 shrink-0 opacity-50"
                  aria-hidden="true"
                />
              </Button>
            </PopoverTrigger>

            <PopoverContent
              align="start"
              className="w-[var(--radix-popover-trigger-width)] min-w-[300px] p-3"
            >
              <Calendar
                className="w-full p-0"
                classNames={{
                  months: "w-full",
                  month: "w-full space-y-4",
                  table: "w-full border-collapse",
                  head_row: "flex w-full",
                  head_cell:
                    "flex-1 text-muted-foreground rounded-md font-normal text-[0.8rem]",
                  row: "flex w-full mt-2",
                  cell: "flex-1 h-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                  day: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-9 w-full p-0 font-normal aria-selected:opacity-100",
                  ),
                }}
                mode="single"
                selected={parts?.date}
                defaultMonth={parts?.date ?? fromDate}
                onSelect={handleDay}
                fromDate={fromDate}
                toDate={toDate}
                locale={ptBR}
                initialFocus
              />

              <div className="mt-3 flex items-center gap-2 border-t pt-3">
                <span className="text-sm text-muted-foreground">Horário</span>

                {/* "" rather than undefined when empty: Radix shows the
                    placeholder for both, but undefined would flip the select
                    between uncontrolled and controlled on every pick/clear. */}
                <Select
                  value={parts ? String(parts.hour) : ""}
                  onValueChange={handleHour}
                  disabled={disabled}
                >
                  <SelectTrigger aria-label="Hora" className="w-20">
                    <SelectValue placeholder="--" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {HOURS.map((hour) => (
                      <SelectItem key={hour} value={String(hour)}>
                        {pad(hour)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <span aria-hidden="true">:</span>

                <Select
                  value={parts ? String(parts.minute) : ""}
                  onValueChange={handleMinute}
                  disabled={disabled}
                >
                  <SelectTrigger aria-label="Minuto" className="w-20">
                    <SelectValue placeholder="--" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {minutes.map((minute) => (
                      <SelectItem key={minute} value={String(minute)}>
                        {pad(minute)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {parts && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-auto"
                    onClick={() => {
                      emit(null);
                      setOpen(false);
                    }}
                  >
                    Limpar
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </>
      )}
    </FieldShell>
  );
};

export { DateTimePickerField };
export type { DateTimePickerFieldProps };
