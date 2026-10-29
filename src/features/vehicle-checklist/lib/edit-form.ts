import {
  asPickerDay,
  dayToSend,
  pickedDayChanged,
} from "@/features/vehicle/lib/picked-day";

import { changedChecklistLinks, type ChecklistLinks } from "./edit-links";
import type { VehicleChecklistProps } from "../types";

/**
 * The checklist edit form's rules: what it opens on, when Salvar turns on,
 * and what it posts. They lived inline in the dialog (update-form/submit and
 * index), where a regression to the old date handling failed no test. No
 * directive: pure, and loadable by a Node process in another zone, which is
 * how the tests prove the day rules.
 */

type StoredChecklist = Pick<
  VehicleChecklistProps,
  | "id"
  | "businessId"
  | "checklist_date"
  | "current_mileage"
  | "notes"
  | "branchId"
  | "vehicleId"
  | "driverId"
>;

/** The answers the form shows as selects, copied as stored. */
const ANSWER_FIELDS = [
  "tires_condition",
  "headlights_working",
  "taillights_working",
  "turn_signals_working",
  "bumpers_condition",
  "windshield_condition",
  "mirrors_condition",
  "seatbelts_working",
  "dashboard_working",
  "steering_wheel_condition",
  "brakes_working",
  "clutch_working",
  "fuel_level_adequate",
  "oil_level_adequate",
  "radiator_water_adequate",
  "brake_fluid_adequate",
  "battery_condition",
  "driver_license_valid",
  "vehicle_documents_valid",
  "insurance_valid",
  "fire_extinguisher_valid",
  "warning_triangle_present",
  "jack_present",
  "spare_tire_condition",
  "overall_condition",
] as const;

/**
 * The form as it opens on a stored checklist. A date-only checklist
 * (00:00 UTC) opens on its own day, the one the table shows, not on the day
 * before in Brazil.
 */
function checklistEditOriginalValues(
  checklist: StoredChecklist &
    Partial<Record<(typeof ANSWER_FIELDS)[number], unknown>>,
): Record<string, unknown> {
  const answers = Object.fromEntries(
    ANSWER_FIELDS.map((field) => [field, checklist[field]]),
  );

  return {
    checklist_date: asPickerDay(checklist.checklist_date),
    current_mileage: checklist.current_mileage?.toString() || "",
    ...answers,
    notes: checklist.notes || "",
  };
}

const asNumber = (value: unknown): number =>
  typeof value === "number" ? value : parseInt(String(value)) || 0;

/**
 * Whether the form differs from what it opened on (Salvar stays off
 * otherwise). The date compares the DAY, as the table reads it: comparing
 * the UTC date of the ISO strings missed a change for an inspection made
 * after 21:00 in Brazil, and counted opening a date-only checklist as one.
 */
function isChecklistEditDirty(
  original: Record<string, unknown>,
  current: Record<string, unknown>,
): boolean {
  return Object.keys(current).some((key) => {
    if (key === "_displayMileage") return false;

    const originalValue = original[key];
    const currentValue = current[key];

    if (originalValue === undefined) return false;

    if (
      typeof currentValue === "boolean" &&
      typeof originalValue === "boolean"
    ) {
      return currentValue !== originalValue;
    }

    if (key === "current_mileage") {
      return asNumber(currentValue) !== asNumber(originalValue);
    }

    if (key === "checklist_date") {
      return pickedDayChanged(
        originalValue as string | null | undefined,
        currentValue as string | null | undefined,
      );
    }

    return (
      (currentValue?.toString() || "") !== (originalValue?.toString() || "")
    );
  });
}

/**
 * What the edit posts besides the answers: the checklist and company ids,
 * only the links the person re-pointed (FLEET-FUEL-1: an untouched driver
 * who has since left, or a closed branch, is history, not a change), and
 * the date as dayToSend puts it: exactly as stored while the day is
 * unchanged, the picked day at the record's own time of day otherwise.
 */
function checklistEditPayload(
  checklist: StoredChecklist,
  pickedDate: unknown,
  selected: Partial<ChecklistLinks>,
): Record<string, string> {
  const payload: Record<string, string> = {
    checklistId: checklist.id,
    businessId: checklist.businessId,
    ...changedChecklistLinks(
      {
        branchId: checklist.branchId,
        vehicleId: checklist.vehicleId,
        driverId: checklist.driverId,
      },
      selected,
    ),
  };

  if (typeof pickedDate === "string" && pickedDate !== "") {
    payload.checklist_date = dayToSend(checklist.checklist_date, pickedDate);
  }

  return payload;
}

export {
  checklistEditOriginalValues,
  checklistEditPayload,
  isChecklistEditDirty,
};
export type { StoredChecklist };
