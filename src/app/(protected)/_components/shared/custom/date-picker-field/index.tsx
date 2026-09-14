"use client";

import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";

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
  } = useDatePicker({ value, onChange });

  return (
    <div className="grid gap-3 relative">
      {errorName?.[0] ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Label
                className={cn("h-4 truncate text-red-500")}
                htmlFor={htmlfor}
              >
                {errorName[0]}
              </Label>
            </TooltipTrigger>
            <TooltipContent
              align="start"
              className="max-w-[300px] p-2
              whitespace-normal break-words"
            >
              {errorName[0]}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <Label className="h-4 truncate" htmlFor={htmlfor}>
          {label.includes("*") ? (
            <>
              {label.replace("*", "")}
              <span className="text-red-500 ml-0.5">*</span>
            </>
          ) : (
            label
          )}
        </Label>
      )}

      <input type="hidden" id={htmlfor} name={name} value={value || ""} />

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !formatted && "text-muted-foreground",
              disabled && "opacity-50 cursor-not-allowed",
            )}
            disabled={disabled}
            aria-label={label}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatted || "Selecione uma data"}
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
              new Date(new Date().setFullYear(new Date().getFullYear() - 100))
            }
            disabled={disabled}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export { DatePickerField };
