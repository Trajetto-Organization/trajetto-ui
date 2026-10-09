"use client";

import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Button, buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";

import { cn } from "@/lib/utils";

import {
  FieldShell,
  parseFieldLabel,
} from "@/components/shared/custom/field-shell";

import { serializeDate } from "./helpers";
import { useDatePicker } from "./hooks";

import type { FormFieldProps } from "../shared/common.types";

const DatePickerField: React.FC<FormFieldProps> = ({
  label,
  htmlfor,
  name,
  errorName,
  value,
  onChange,
  disabled,
  allowFutureDates = false,
  hint,
  required,
  dateOnly = false,
}): JSX.Element => {
  const {
    formatted,
    years,
    months,
    displayMonth,
    displayYear,
    handleYearChange,
    handleMonthChange,
    handleSelect,
    selectedDate,
  } = useDatePicker({
    value,
    onChange,
    dateOnly,
    allowFutureDates,
    // The same rule FieldShell uses for the red star: "Data *" is required.
    required: required ?? parseFieldLabel(label ?? "").required,
  });

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
        No id on the hidden field any more. It carries the value to the form
        and nothing else — a label pointing at it named something a keyboard
        can never reach, while the button people actually operate had no
        associated label at all.
      */}
          {/*
        A caller without state of its own (name only, no `value`) still
        posts the day that was picked: the hook keeps the selection, and
        this used to read the absent prop and post "".
      */}
          <input
            type="hidden"
            name={name}
            value={
              value !== undefined
                ? value || ""
                : selectedDate
                  ? serializeDate(selectedDate, dateOnly)
                  : ""
            }
          />

          <Popover>
            <PopoverTrigger asChild>
              {/*
            The calendar at the END, like the chevron of every select beside
            it (decision 3.9), and a pointer: the whole field opens the
            picker, it is not a text box.

            `combobox`, like the SelectTrigger beside it: `aria-required`
            is not allowed on a `button`, so on the plain button it was
            ignored and the red star (hidden from the reader) was all that
            said "required". Radix adds `aria-haspopup="dialog"` and
            `aria-expanded`, both valid on a combobox.
          */}
              <Button
                {...control}
                role="combobox"
                variant="outline"
                className={cn(
                  "w-full cursor-pointer justify-between gap-2 text-left font-normal",
                  !formatted && "text-muted-foreground",
                  disabled && "opacity-50 cursor-not-allowed",
                  control["aria-invalid"] &&
                    "border-red-600 dark:border-red-500",
                )}
                disabled={disabled}
              >
                <span className="min-w-0 truncate">
                  {formatted || "Selecione uma data"}
                </span>
                <CalendarIcon
                  className="h-4 w-4 shrink-0 opacity-50"
                  aria-hidden="true"
                />
              </Button>
            </PopoverTrigger>

            {/* `w-full` would be a no-op here: the popover lives in a portal, so
        100% resolves against its own content box. Matching the field is what
        the Radix trigger-width variable is for — the same mechanism
        SelectContent already uses, which is why selects line up and this
        did not.

        The content below stretches with it (selects share the row, day cells
        flex), so a wide field gets a wide calendar instead of a small grid
        floating in white space. */}
            <PopoverContent
              align="start"
              className="w-[var(--radix-popover-trigger-width)] min-w-[300px]"
            >
              <div className="flex w-full items-center gap-2 mb-2">
                <Select
                  value={displayYear.toString()}
                  onValueChange={handleYearChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={displayMonth.toString()}
                  onValueChange={handleMonthChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Calendar
                className="w-full p-0"
                // The base calendar sizes each day to a fixed 36px, which leaves
                // dead space once the popover follows a wide field. Flexing the
                // cells makes the grid share whatever width it is given.
                classNames={{
                  months: "w-full",
                  month: "w-full space-y-4",
                  table: "w-full border-collapse",
                  head_row: "flex w-full",
                  head_cell:
                    "flex-1 text-muted-foreground rounded-md font-normal text-[0.8rem]",
                  row: "flex w-full mt-2",
                  cell: `flex-1 h-9 text-center text-sm p-0 relative
                [&:has([aria-selected].day-outside)]:bg-accent/50
                [&:has([aria-selected])]:bg-accent
                first:[&:has([aria-selected])]:rounded-l-md
                last:[&:has([aria-selected])]:rounded-r-md
                focus-within:relative focus-within:z-20`,
                  day: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-9 w-full p-0 font-normal aria-selected:opacity-100",
                  ),
                }}
                mode="single"
                selected={selectedDate ?? undefined}
                onSelect={handleSelect}
                month={new Date(displayYear, displayMonth)}
                onMonthChange={(d) => {
                  handleYearChange(d.getFullYear().toString());
                  handleMonthChange(d.getMonth().toString());
                }}
                initialFocus
                locale={ptBR}
                toDate={allowFutureDates ? undefined : new Date()}
                fromDate={
                  new Date(
                    new Date().setFullYear(new Date().getFullYear() - 100),
                  )
                }
                disabled={disabled}
              />
            </PopoverContent>
          </Popover>
        </>
      )}
    </FieldShell>
  );
};

export { DatePickerField };
