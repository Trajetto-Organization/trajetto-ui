import {
  formatCurrencyToNumber,
  formatLiters,
  formatMileage,
  litersToNumber,
  mileageToNumber,
} from "@/lib/format-values";
import { dayToSend, pickedDayChanged } from "@/features/vehicle/lib/picked-day";

import { formatPricePerLiter } from "./price";

/**
 * What an edit of a refueling changes, and what it sends (FLEET-FUEL-1,
 * decision 2.5). No directive: pure, and tested.
 */
interface FuelLinks {
  branchId: string;
  vehicleId: string;
  driverId: string;
  fuelTypeId: string;
}

/**
 * The links an edit sends.
 *
 * The edit form used to post every link of the record — branch, vehicle,
 * driver, fuel type — even untouched, and the API validated each against
 * today's state: last month's fueling of a truck that is inactive now, of a
 * driver who left, or at a closed branch could not have its price corrected.
 * Only a link the person actually changed goes out now.
 */
function changedFuelLinks(
  original: Partial<FuelLinks>,
  selected: Partial<FuelLinks>,
): Partial<FuelLinks> {
  const changed: Partial<FuelLinks> = {};

  for (const key of [
    "branchId",
    "vehicleId",
    "driverId",
    "fuelTypeId",
  ] as const) {
    const value = selected[key];

    // An empty selection is not "clear the link": every fueling has all four.
    if (value && value !== original[key]) changed[key] = value;
  }

  return changed;
}

interface FuelRecordValues {
  refueling_date: string | Date;
  current_mileage: number;
  liters_amount: number;
  price_per_liter: number;
  notes?: string | null;
}

interface FuelFormDisplay {
  refueling_date: string;
  current_mileage: string;
  liters_amount: string;
  price_per_liter: string;
  notes: string;
}

/** The record as the edit form shows it. */
function fuelFormFromRecord(record: FuelRecordValues): FuelFormDisplay {
  return {
    refueling_date:
      record.refueling_date instanceof Date
        ? record.refueling_date.toISOString()
        : record.refueling_date,
    current_mileage: formatMileage(String(Math.trunc(record.current_mileage))),
    liters_amount: formatLiters(String(record.liters_amount)),
    // Three decimals: the money format's two turned 5,899 into 5,90 and the
    // untouched form into a change.
    price_per_liter: formatPricePerLiter(record.price_per_liter),
    notes: record.notes ?? "",
  };
}

/**
 * Whether the typed values differ from the record, compared as the numbers
 * and the day they mean — "45,5" and 45.5 are the same litres, and the same
 * day picked again (local midnight over a stored 00:00 UTC) is no change.
 */
function fuelValuesChanged(
  record: FuelRecordValues,
  typed: FuelFormDisplay,
): boolean {
  return [
    pickedDayChanged(record.refueling_date, typed.refueling_date || null),
    Number(mileageToNumber(typed.current_mileage)) !==
      Math.trunc(record.current_mileage),
    Number(litersToNumber(typed.liters_amount)) !==
      Number(record.liters_amount),
    formatCurrencyToNumber(typed.price_per_liter) !==
      Number(record.price_per_liter),
    typed.notes !== (record.notes ?? ""),
  ].some(Boolean);
}

interface FuelEditChanges {
  values: boolean;
  links: boolean;
  photo: boolean;
  location: boolean;
}

/** Save is enabled only when something changed (decision 2.5). */
function hasFuelEditChanges(changes: FuelEditChanges): boolean {
  return changes.values || changes.links || changes.photo || changes.location;
}

interface FuelLocation {
  latitude: number | null;
  longitude: number | null;
}

/** Whether the person moved (or cleared) the station's location. */
function fuelLocationChanged(
  record: { latitude?: number | null; longitude?: number | null },
  current: FuelLocation,
): boolean {
  return (
    current.latitude !== (record.latitude ?? null) ||
    current.longitude !== (record.longitude ?? null)
  );
}

interface FuelEditRecord extends FuelRecordValues, FuelLinks {
  id: string;
  businessId: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface FuelEdit {
  record: FuelEditRecord;
  /** What the form shows now. */
  values: FuelFormDisplay;
  /** The wizard's current selection. */
  selectedLinks: Partial<FuelLinks>;
  location: FuelLocation;
}

/**
 * What an edit adds to the form the Server Action posts, beside the typed
 * fields: the record's ids, the links the person changed, the location only
 * when moved, the exact stored km when the whole km shown was left alone,
 * and the day as dayToSend puts it.
 *
 * - The location: the API records a sent location as edited by this user
 *   (USER_MANUAL), and the old form resent the app's GPS fix untouched on
 *   every price correction, rewriting its audit. An empty pair clears it.
 * - The km: the field shows whole kilometres, so 1.234,5 read back as 1.234
 *   would have been a change that moved the vehicle's odometer.
 */
function applyFuelEdit(formData: FormData, edit: FuelEdit): void {
  const { record, values, selectedLinks, location } = edit;

  // The day exactly as stored while unchanged (the picker hands back local
  // midnight for the same day picked again, which moved a 00:00 UTC day to
  // 03:00 UTC); a changed day keeps the refueling's own time of day.
  if (values.refueling_date) {
    formData.set(
      "refueling_date",
      dayToSend(record.refueling_date, values.refueling_date),
    );
  }

  if (
    Number(mileageToNumber(values.current_mileage)) ===
    Math.trunc(record.current_mileage)
  ) {
    formData.set("current_mileage", String(record.current_mileage));
  }

  if (fuelLocationChanged(record, location)) {
    formData.set(
      "latitude",
      location.latitude === null ? "" : String(location.latitude),
    );
    formData.set(
      "longitude",
      location.longitude === null ? "" : String(location.longitude),
    );
  }

  formData.set("fuelId", record.id);
  formData.set("businessId", record.businessId);

  for (const [key, value] of Object.entries(
    changedFuelLinks(record, selectedLinks),
  )) {
    if (value) formData.set(key, value);
  }
}

export {
  applyFuelEdit,
  changedFuelLinks,
  fuelFormFromRecord,
  fuelLocationChanged,
  fuelValuesChanged,
  hasFuelEditChanges,
  type FuelEdit,
  type FuelEditChanges,
  type FuelEditRecord,
  type FuelFormDisplay,
  type FuelLinks,
  type FuelLocation,
  type FuelRecordValues,
};
