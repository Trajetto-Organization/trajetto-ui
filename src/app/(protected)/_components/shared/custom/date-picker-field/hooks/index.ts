import { useState, useEffect } from "react";
import { isValid, format } from "date-fns";

import { ptBR } from "date-fns/locale";
import type { DatePickerProps } from "../date-picker.types";

import { parseDateValue, pickerYears, serializeDate } from "../helpers";

function useDatePicker({
  value,
  onChange,
  dateOnly = false,
  allowFutureDates = false,
  required = false,
}: DatePickerProps) {
  const parseDate = (dateValue: string | undefined) =>
    parseDateValue(dateValue, dateOnly);

  // Use the safe parse function
  const parsed = parseDate(value);
  const [selectedDate, setSelectedDate] = useState<Date | null>(parsed);

  const [displayMonth, setDisplayMonth] = useState<number>(
    parsed ? parsed.getMonth() : new Date().getMonth(),
  );
  const [displayYear, setDisplayYear] = useState<number>(
    parsed ? parsed.getFullYear() : new Date().getFullYear(),
  );

  useEffect(() => {
    const parsedDate = parseDate(value);

    if (parsedDate) {
      setSelectedDate(parsedDate);
      setDisplayMonth(parsedDate.getMonth());

      setDisplayYear(parsedDate.getFullYear());
    } else {
      setSelectedDate(null);
    }
  }, [value, dateOnly]);

  const handleYearChange = (yearStr: string) => setDisplayYear(Number(yearStr));
  const handleMonthChange = (monthStr: string) =>
    setDisplayMonth(Number(monthStr));

  const handleSelect = (date: Date | undefined) => {
    // The calendar reports a click on the selected day as `undefined`; on a
    // required field that is the person confirming the day, not clearing it.
    if (!date && required) return;

    setSelectedDate(date || null);

    if (date) {
      setDisplayMonth(date.getMonth());
      setDisplayYear(date.getFullYear());

      if (onChange) onChange(serializeDate(date, dateOnly));
    } else {
      if (onChange) onChange("");
    }
  };

  // Add additional checks before formatting
  const formatted =
    selectedDate && isValid(selectedDate)
      ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR })
      : "";

  const years = pickerYears(
    new Date().getFullYear(),
    allowFutureDates,
    displayYear,
  );

  const months = [
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
  ];

  return {
    selectedDate,
    formatted,
    displayMonth,
    displayYear,
    years,
    months,
    handleYearChange,
    handleMonthChange,
    handleSelect,
  };
}

export { useDatePicker };
