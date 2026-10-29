/**
 * The checklist's mileage against the vehicle's, as far as the browser can
 * tell from what the form already loaded (decision 16.703). No directive: a
 * pure rule, tested as is.
 *
 * The API places a reading by its timestamp (trajetto-api shared/vehicle/
 * odometer-timeline and placeReading). The browser only KNOWS a reading is
 * the newest while the date is the form's untouched default, the moment the
 * form opened: nothing can be recorded after it, so the km must be strictly
 * above the vehicle's current mileage, the same sentence the API answers
 * with. Any picked date (today included: the picker sends local midnight,
 * which may sit before a reading taken this morning) may fit between the
 * readings around it, which only the API knows, so the browser says nothing
 * there rather than block a reading the server would accept. For the same
 * reason the edit form does not run this rule: the stored date is a past
 * moment.
 */

interface ChecklistMileageInput {
  /** What was typed, as a number; empty is the schema's business. */
  mileage: unknown;

  /** The form's current date value (ISO string). */
  checklistDate: unknown;

  /** The ISO string the form defaulted the date to when it opened, if it did. */
  defaultDate: string | null | undefined;

  /** The vehicle's current mileage as loaded; unknown while it loads. */
  vehicleMileage: number | null | undefined;
}

function asMileage(value: unknown): number | null {
  if (typeof value === "number")
    return Number.isFinite(value) && value > 0 ? value : null;
  if (typeof value !== "string" || value.trim() === "") return null;

  const parsed = Number(value.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function checklistMileageIssue({
  mileage,
  checklistDate,
  defaultDate,
  vehicleMileage,
}: ChecklistMileageInput): string | null {
  if (!defaultDate || checklistDate !== defaultDate) return null;

  const typed = asMileage(mileage);
  if (
    typed === null ||
    typeof vehicleMileage !== "number" ||
    vehicleMileage <= 0
  )
    return null;

  if (typed > vehicleMileage) return null;

  return `A quilometragem deve ser maior que a atual do veículo (${vehicleMileage.toLocaleString("pt-BR")} km).`;
}

export { checklistMileageIssue };
export type { ChecklistMileageInput };
