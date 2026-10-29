"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { cn } from "@/lib/utils";

const PICKER_MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

interface MonthYearSelectsProps {
  year: number;
  /** 0-11. */
  month: number;
  /** Newest first (pickerYears). */
  years: readonly number[];
  onYearChange: (year: string) => void;
  onMonthChange: (month: string) => void;
  /** Extra classes for both triggers (the range panel's are h-8). */
  triggerClassName?: string;
  className?: string;
}

/**
 * The year and month jump above a calendar: the arrows go one month at a
 * time, and a birth date or last year's quarter is many clicks away.
 * Shared by the single-day field and the range panel so both read the same.
 */
const MonthYearSelects = ({
  year,
  month,
  years,
  onYearChange,
  onMonthChange,
  triggerClassName,
  className,
}: MonthYearSelectsProps): JSX.Element => (
  <div className={cn("flex w-full items-center gap-2", className)}>
    <Select value={year.toString()} onValueChange={onYearChange}>
      <SelectTrigger
        aria-label="Ano"
        className={cn("w-full", triggerClassName)}
      >
        <SelectValue placeholder="Ano" />
      </SelectTrigger>
      <SelectContent>
        {years.map((option) => (
          <SelectItem key={option} value={option.toString()}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    <Select value={month.toString()} onValueChange={onMonthChange}>
      <SelectTrigger
        aria-label="Mês"
        className={cn("w-full", triggerClassName)}
      >
        <SelectValue placeholder="Mês" />
      </SelectTrigger>
      <SelectContent>
        {PICKER_MONTHS.map((name, index) => (
          <SelectItem key={name} value={index.toString()}>
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

export { MonthYearSelects, PICKER_MONTHS };
