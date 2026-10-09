"use client";

import { useState } from "react";

import { formatLiters, formatMileage } from "@/lib/format-values";

import { formatPricePerLiter, sanitizePriceTyping } from "../lib/price";

/**
 * The typed values of a refueling form, as the person sees them ("15.234",
 * "45,237", "R$ 5,49"). The numbers that go to the server are derived from
 * these at render time (hidden inputs in FuelFields), so nothing reaches into
 * the DOM to rewrite an input before submit — the admin copy did, with
 * `document.querySelector`, and the two copies had drifted on it.
 */
interface FuelFormValues {
  refueling_date: string;
  current_mileage: string;
  liters_amount: string;
  price_per_liter: string;
  notes: string;
}

const EMPTY_FUEL_FORM: FuelFormValues = {
  refueling_date: "",
  current_mileage: "",
  liters_amount: "",
  price_per_liter: "",
  notes: "",
};

function useFuelInputs(initial: FuelFormValues) {
  const [values, setValues] = useState<FuelFormValues>(initial);

  const set = (field: keyof FuelFormValues, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  return {
    values,
    setRefuelingDate: (value: string) => set("refueling_date", value),
    setNotes: (value: string) => set("notes", value),
    handleMileageChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      set(
        "current_mileage",
        formatMileage(event.target.value.replace(/\D/g, "")),
      ),
    handleLitersChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      set("liters_amount", formatLiters(event.target.value)),
    // Three decimals, as pumps price fuel (R$ 5,899).
    handlePriceChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      set("price_per_liter", sanitizePriceTyping(event.target.value)),
    handlePriceBlur: () => {
      const raw = values.price_per_liter;

      if (!raw || raw === "," || raw === ".") {
        set("price_per_liter", "");
        return;
      }

      set("price_per_liter", formatPricePerLiter(raw));
    },
  };
}

export { EMPTY_FUEL_FORM, useFuelInputs, type FuelFormValues };
