import { useState } from "react";
import {
  formatCurrencyToNumber,
  formatToBrazilianCurrency,
  formatMileage,
  formatLiters,
} from "@/lib/format-values";

function useFuelFormInputs(initialFormValues: Record<string, string>) {
  const [refuelingDate, setRefuelingDate] = useState<string>(
    () => initialFormValues.refueling_date || "",
  );

  const [displayPricePerLiter, setDisplayPricePerLiter] = useState<string>(
    () => initialFormValues.price_per_liter || "",
  );

  const [displayMileage, setDisplayMileage] = useState<string>(
    () => initialFormValues.current_mileage || "",
  );

  const [displayLiters, setDisplayLiters] = useState<string>(
    () => initialFormValues.liters_amount || "",
  );

  const [notes, setNotes] = useState<string>(
    () => initialFormValues.notes || "",
  );

  const handleRefuelingDateChange = (value: string): void => {
    setRefuelingDate(value);
  };

  const handlePricePerLiterChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    let inputValue = e.target.value.replace(/[^\d,.]/g, "");
    setDisplayPricePerLiter(inputValue);
  };

  const handlePricePerLiterBlur = (): void => {
    if (
      !displayPricePerLiter ||
      displayPricePerLiter === "," ||
      displayPricePerLiter === "."
    ) {
      setDisplayPricePerLiter("");
      return;
    }
    const newNumericValue = formatCurrencyToNumber(displayPricePerLiter);
    setDisplayPricePerLiter(formatToBrazilianCurrency(newNumericValue));
  };

  const handleMileageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const rawValue = e.target.value;
    const numbersOnly = rawValue.replace(/\D/g, "");
    setDisplayMileage(formatMileage(numbersOnly));
  };

  const handleLitersChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const rawValue = e.target.value;
    setDisplayLiters(formatLiters(rawValue));
  };

  const handleLitersBlur = (): void => {
    const numericValue = displayLiters.replace(",", ".");
    const input = document.querySelector(
      'input[name="liters_amount"]',
    ) as HTMLInputElement;

    if (input) {
      input.value = numericValue;
    }
  };

  const getFormValues = () => ({
    refueling_date: refuelingDate,
    current_mileage: displayMileage,
    liters_amount: displayLiters,
    price_per_liter: displayPricePerLiter,
    notes: notes,
  });

  return {
    refuelingDate,
    displayPricePerLiter,
    displayMileage,
    displayLiters,
    notes,
    setNotes,
    handleRefuelingDateChange,
    handlePricePerLiterChange,
    handlePricePerLiterBlur,
    handleMileageChange,
    handleLitersChange,
    handleLitersBlur,
    getFormValues,
  };
}

export { useFuelFormInputs };
