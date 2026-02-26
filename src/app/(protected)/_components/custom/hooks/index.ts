import { useState, useEffect } from "react";
import { parseISO, isValid, format } from "date-fns";

import { ptBR } from "date-fns/locale";
import { DatePickerProps } from "../dto";

function useDatePicker({ value, onChange }: DatePickerProps) {
  // Try to parse the date, but add validation
  const parseDate = (dateValue: string | undefined) => {
    if (!dateValue) return null;

    try {
      const parsed = parseISO(dateValue);

      // Check if the parsed date is valid
      return isValid(parsed) ? parsed : null;
    } catch (error) {
      return null;
    }
  };

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
  }, [value]);

  const handleYearChange = (yearStr: string) => setDisplayYear(Number(yearStr));
  const handleMonthChange = (monthStr: string) =>
    setDisplayMonth(Number(monthStr));

  const handleSelect = (date: Date | undefined) => {
    setSelectedDate(date || null);

    if (date) {
      setDisplayMonth(date.getMonth());
      setDisplayYear(date.getFullYear());

      if (onChange) onChange(date.toISOString());
    } else {
      if (onChange) onChange("");
    }
  };

  // Add additional checks before formatting
  const formatted =
    selectedDate && isValid(selectedDate)
      ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR })
      : "";

  const years = Array.from(
    { length: 101 },
    (_, i) => new Date().getFullYear() - i,
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
