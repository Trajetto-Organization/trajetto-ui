import { litersToNumber, mileageToNumber } from "@/lib/format-values";

import type { FuelFormValues } from "../form/use-fuel-inputs";

/**
 * What the refueling form's live validation reads (decision 16.700). No
 * directive: pure, and tested without rendering the dialogs.
 */

/** The five fields, in the form's order: what a submit checks. */
const FUEL_FIELDS = [
  "refueling_date",
  "current_mileage",
  "liters_amount",
  "price_per_liter",
  "notes",
] as const;

/** The typed km and liters live in display inputs beside the posted ones. */
const FUEL_CONTROL_IDS = {
  current_mileage: "current_mileage_display",
  liters_amount: "liters_amount_display",
  odometer_photo: "odometer_photo",
};

/**
 * The values as the action's schema reads them: the numbers the hidden
 * inputs post ("15234", "45.237"), not the display text ("15.234").
 */
function fuelSchemaValues(values: FuelFormValues): Record<string, string> {
  return {
    refueling_date: values.refueling_date,
    current_mileage: mileageToNumber(values.current_mileage),
    liters_amount: litersToNumber(values.liters_amount),
    price_per_liter: values.price_per_liter,
    notes: values.notes,
  };
}

const ODOMETER_PHOTO_REQUIRED = "A foto do odômetro é obrigatória.";

/** The create's required photo, in the action's words; a refused file says why. */
function odometerPhotoIssue({
  photo,
  fileError,
  required,
}: {
  photo: unknown;
  fileError: string | null;
  required: boolean;
}): string | null {
  if (fileError) return fileError;

  return required && !photo ? ODOMETER_PHOTO_REQUIRED : null;
}

/**
 * A note under the km, never an error: the browser cannot know whether the
 * vehicle has readings after the picked day (the API's placeReading). With
 * none, a km at or below the vehicle's current one is refused; with one, it
 * is accepted if it fits between its neighbours. A picked day is midnight,
 * so a reading made earlier the same day counts as a later one (decision
 * 16.703, the checklist's rule). So the form says what it knows and leaves
 * the verdict to the API.
 */
function fuelMileageNote(
  typedMileage: string,
  vehicleMileage: number | null | undefined,
): string | null {
  const digits = mileageToNumber(typedMileage);

  if (!digits || typeof vehicleMileage !== "number" || vehicleMileage <= 0) {
    return null;
  }

  const mileage = Number(digits);

  if (!Number.isFinite(mileage) || mileage > vehicleMileage) return null;

  return `Igual ou abaixo da atual do veículo (${vehicleMileage.toLocaleString("pt-BR")} km): só é aceita se houver leitura posterior à data escolhida.`;
}

export {
  FUEL_CONTROL_IDS,
  FUEL_FIELDS,
  ODOMETER_PHOTO_REQUIRED,
  fuelMileageNote,
  fuelSchemaValues,
  odometerPhotoIssue,
};
