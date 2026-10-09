import { getPhotoRequirements } from "../photo-requirements";

/**
 * What the checklist forms validate live, beyond the schema (decision
 * 16.700). No directive: pure, tested as is.
 */

/** A photo's own key, apart from its answer: "current_mileage" is also the km field. */
const photoFieldKey = (field: string): string => `photo:${field}`;

/** Photos the action and the app always demand, answered or not. */
const ALWAYS_REQUIRED_PHOTOS = new Set([
  "current_mileage",
  "fuel_level_adequate",
  "tires_condition",
]);

/** The answers and photos in the order the form shows them (the first error gets focus). */
const CHECKLIST_FORM_FIELDS: readonly string[] = [
  "checklist_date",
  "current_mileage",
  photoFieldKey("current_mileage"),
  "tires_condition",
  photoFieldKey("tires_condition"),
  "fuel_level_adequate",
  photoFieldKey("fuel_level_adequate"),
  "headlights_working",
  photoFieldKey("headlights_working"),
  "taillights_working",
  photoFieldKey("taillights_working"),
  "turn_signals_working",
  photoFieldKey("turn_signals_working"),
  "bumpers_condition",
  photoFieldKey("bumpers_condition"),
  "windshield_condition",
  photoFieldKey("windshield_condition"),
  "mirrors_condition",
  photoFieldKey("mirrors_condition"),
  "seatbelts_working",
  photoFieldKey("seatbelts_working"),
  "dashboard_working",
  photoFieldKey("dashboard_working"),
  "brakes_working",
  photoFieldKey("brakes_working"),
  "clutch_working",
  photoFieldKey("clutch_working"),
  "oil_level_adequate",
  photoFieldKey("oil_level_adequate"),
  "radiator_water_adequate",
  photoFieldKey("radiator_water_adequate"),
  "brake_fluid_adequate",
  photoFieldKey("brake_fluid_adequate"),
  "steering_wheel_condition",
  photoFieldKey("steering_wheel_condition"),
  "battery_condition",
  photoFieldKey("battery_condition"),
  "driver_license_valid",
  "vehicle_documents_valid",
  "insurance_valid",
  "fire_extinguisher_valid",
  "warning_triangle_present",
  "jack_present",
  "spare_tire_condition",
  photoFieldKey("spare_tire_condition"),
  "overall_condition",
  "notes",
];

/** The answer fields alone (the edit form checks no photo presence). */
const CHECKLIST_ANSWER_FIELDS: readonly string[] = CHECKLIST_FORM_FIELDS.filter(
  (field) => !field.startsWith("photo:"),
);

const answered = (value: unknown): boolean =>
  value !== undefined && value !== null && value !== "";

/**
 * A missing photo, per photo key. A photo that depends on an answer ("Freios
 * funcionando: Não") is only asked once that answer is given: an unanswered
 * question already has its own message, and a second one under its photo
 * said the same thing twice.
 */
function checklistPhotoIssues(
  values: Record<string, unknown>,
  files: Record<string, File[] | undefined>,
): Record<string, string | null> {
  const requirements = getPhotoRequirements(values);
  const issues: Record<string, string | null> = {};

  for (const [field, requirement] of Object.entries(requirements)) {
    const asked =
      requirement.required &&
      (ALWAYS_REQUIRED_PHOTOS.has(field) || answered(values[field]));
    const missing = (files[field]?.length ?? 0) === 0;

    issues[photoFieldKey(field)] =
      asked && missing ? "Adicione ao menos uma foto." : null;
  }

  return issues;
}

export {
  CHECKLIST_ANSWER_FIELDS,
  CHECKLIST_FORM_FIELDS,
  checklistPhotoIssues,
  photoFieldKey,
};
