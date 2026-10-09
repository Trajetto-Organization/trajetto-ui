import type { ZodTypeAny } from "zod";

import {
  vehicleCrossFieldIssues,
  vehicleFieldsSchema,
} from "@/schemas/create-update-vehicle-schema";

import type { VehicleRow } from "../types";
import { asPickerDay, pickedDayKey } from "./picked-day";

/**
 * What the vehicle form holds and what it sends (FLEET-VEH-2, VEH-3, VEH-8).
 *
 * The edit used to resend EVERY field: a vehicle registered with one axle
 * failed any later edit (the old update demanded two), and a MASTER who
 * opened the form, waited while a refuelling moved the odometer, and saved
 * another field wrote the old reading back. Now the edit sends only what
 * changed. Pure functions, so the rules are tested without a browser.
 */

/** The fields typed on the last step; relations are picked in the steps before. */
const VEHICLE_FORM_FIELDS = [
  "description",
  "license_plate",
  "brand",
  "model",
  "acquisition_date",
  "fleet_type",
  "fleet_id",
  "last_maintenance_date",
  "current_mileage",
  "last_maintenance_mileage",
  "maintenance_interval_km",
  "maintenance_interval_months",
  "renavam",
  "manufacturing_year",
  "model_year",
  "km_per_liter",
  "number_of_axles",
  "status",
] as const;

type VehicleFormField = (typeof VEHICLE_FORM_FIELDS)[number];

type VehicleFormValues = Record<VehicleFormField, string>;

/** The pickers of the first steps, by id. */
interface VehicleRelations {
  branchId: string;
  driverId: string;
  vehicleTypeId: string;
  fuelTypeId: string;
}

const EMPTY_FORM: VehicleFormValues = Object.fromEntries(
  VEHICLE_FORM_FIELDS.map((field) => [field, ""]),
) as VehicleFormValues;

/** The year of a stored year date, read in UTC (it is 1 January, UTC midnight). */
function yearOf(value: string | null | undefined): string {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "" : String(date.getUTCFullYear());
}

function asText(value: string | number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

/** The form as it opens on an existing vehicle. */
function vehicleFormValues(vehicle: VehicleRow): VehicleFormValues {
  return {
    description: vehicle.description,
    license_plate: vehicle.license_plate,
    brand: vehicle.brand,
    model: vehicle.model,
    acquisition_date: asPickerDay(vehicle.acquisition_date),
    fleet_type: vehicle.fleet_type,
    fleet_id: asText(vehicle.fleet_id),
    last_maintenance_date: asPickerDay(vehicle.last_maintenance_date),
    current_mileage: asText(vehicle.current_mileage),
    last_maintenance_mileage: asText(vehicle.last_maintenance_mileage),
    maintenance_interval_km: asText(vehicle.maintenance_interval_km),
    maintenance_interval_months: asText(vehicle.maintenance_interval_months),
    renavam: vehicle.renavam,
    manufacturing_year: yearOf(vehicle.manufacturing_year),
    model_year: yearOf(vehicle.model_year),
    km_per_liter: asText(vehicle.km_per_liter),
    number_of_axles: asText(vehicle.number_of_axles),
    status: vehicle.status,
  };
}

function vehicleRelations(vehicle?: VehicleRow): VehicleRelations {
  return {
    branchId: vehicle?.branchId ?? "",
    driverId: vehicle?.driverId ?? "",
    vehicleTypeId: vehicle?.vehicleTypeId ?? "",
    fuelTypeId: vehicle?.fuelTypeId ?? "",
  };
}

const NUMERIC_FIELDS: ReadonlySet<VehicleFormField> = new Set([
  "current_mileage",
  "last_maintenance_mileage",
  "maintenance_interval_km",
  "maintenance_interval_months",
  "km_per_liter",
  "number_of_axles",
]);

const DATE_FIELDS: ReadonlySet<VehicleFormField> = new Set([
  "acquisition_date",
  "last_maintenance_date",
]);

/**
 * A value as the comparison sees it: "2,5" and "2.5" are the same number,
 * and a date is the DAY it means (pickedDayKey, the checklist edit's rule):
 * the same day picked again at local midnight on a date stored with a time,
 * or stored date-only, is not a change and is not sent.
 */
function comparable(field: VehicleFormField, value: string): string {
  const trimmed = value.trim();

  if (!trimmed) return "";

  if (NUMERIC_FIELDS.has(field)) {
    const number = Number(trimmed.replace(",", "."));
    return Number.isNaN(number) ? trimmed : String(number);
  }

  if (DATE_FIELDS.has(field)) return pickedDayKey(trimmed) ?? trimmed;

  if (field === "license_plate") return trimmed.toUpperCase();

  return trimmed;
}

/** The fields whose value differs from what the vehicle holds. */
function changedVehicleFields(
  initial: VehicleFormValues,
  current: VehicleFormValues,
): VehicleFormField[] {
  return VEHICLE_FORM_FIELDS.filter(
    (field) =>
      comparable(field, initial[field]) !== comparable(field, current[field]),
  );
}

function changedRelations(
  initial: VehicleRelations,
  current: VehicleRelations,
): Array<keyof VehicleRelations> {
  return (Object.keys(initial) as Array<keyof VehicleRelations>).filter(
    (key) => initial[key] !== current[key],
  );
}

/**
 * What an edit sends: the changed fields and relations only. A cleared
 * optional relation goes as "" (the API reads it as null), so "sem
 * motorista" is a change like any other.
 */
function vehicleEditPayload(
  initial: { values: VehicleFormValues; relations: VehicleRelations },
  current: { values: VehicleFormValues; relations: VehicleRelations },
): Record<string, string> {
  const payload: Record<string, string> = {};

  for (const field of changedVehicleFields(initial.values, current.values)) {
    payload[field] = current.values[field];
  }

  for (const key of changedRelations(initial.relations, current.relations)) {
    payload[key] = current.relations[key];
  }

  return payload;
}

/**
 * The years each field offers, newest first (FLEET-VEH-3): fabrication up
 * to this year, the model up to next year — a 2026/2027 truck is common, and
 * the date picker capped both at today.
 */
function yearOptions(
  kind: "manufacturing" | "model",
  now: Date = new Date(),
  earliest = 1980,
): string[] {
  const latest = now.getFullYear() + (kind === "model" ? 1 : 0);

  return Array.from({ length: latest - earliest + 1 }, (_, index) =>
    String(latest - index),
  );
}

/** A picked year as the API stores it: 1 January of that year. */
function yearToDateString(year: string): string {
  return /^\d{4}$/.test(year.trim()) ? `${year.trim()}-01-01` : year;
}

/**
 * The type's axles become the vehicle's until the person types their own
 * (FLEET-VTYPE-3): the type is the default, the vehicle may differ.
 */
function axlesAfterTypeChange(input: {
  currentAxles: string;
  typeAxles: number | undefined;
  axlesEditedByHand: boolean;
}): string {
  if (input.axlesEditedByHand || input.typeAxles === undefined) {
    return input.currentAxles;
  }

  return String(input.typeAxles);
}

/**
 * Revision tracking (last revision, interval in km and months) feeds only
 * Gestão de Frotas: service orders, the maintenance standing and the
 * "Manutenção da frota" chart. A company without FLEET is not asked for it.
 * The MASTER works across companies and unknown modules are no verdict, so
 * both keep the fields (the sidebar's rule).
 */
function showsMaintenanceFields(context: {
  role: string | null | undefined;
  enabledModules: readonly string[] | null | undefined;
}): boolean {
  if (context.role === "MASTER") return true;

  return !context.enabledModules || context.enabledModules.includes("FLEET");
}

/**
 * What a create sends for the revision interval when the fields are hidden.
 * The API and the database still require both (vehicle columns are NOT
 * NULL), so a deliveries-only company stores a common default that nothing
 * reads until it hires FLEET, when the fields show up for editing.
 */
const MAINTENANCE_DEFAULTS_WITHOUT_FLEET = {
  last_maintenance_mileage: "",
  last_maintenance_date: "",
  maintenance_interval_km: "10000",
  maintenance_interval_months: "12",
} as const satisfies Partial<VehicleFormValues>;

/** The payload a create sends: every field, the years as 1 January. */
function vehicleCreatePayload(
  values: VehicleFormValues,
  relations: VehicleRelations,
  options: { withMaintenance: boolean } = { withMaintenance: true },
): Record<string, string> {
  return {
    ...values,
    ...(options.withMaintenance ? {} : MAINTENANCE_DEFAULTS_WITHOUT_FLEET),
    manufacturing_year: yearToDateString(values.manufacturing_year),
    model_year: yearToDateString(values.model_year),
    ...relations,
  };
}

/**
 * The schema the live validation runs: the action's own field rules, only
 * for the fields being checked (the visible ones on create, the changed
 * ones on edit — an untouched legacy value is never judged by today's rule).
 */
function vehicleFormSchema(fields: readonly VehicleFormField[]): ZodTypeAny {
  const mask = Object.fromEntries(
    fields.map((field) => [field, true]),
  ) as Partial<Record<VehicleFormField, true>>;

  return vehicleFieldsSchema.pick(mask);
}

/** A field's value as the schema reads it, or undefined when it does not parse. */
function parsedField(field: VehicleFormField, value: string): unknown {
  const result = vehicleFieldsSchema.shape[field].safeParse(value);

  return result.success ? result.data : undefined;
}

/**
 * The rules between fields, live (the schema's refine waits for every field
 * to be valid). On edit a pair is judged only when one of its fields
 * changed: the API checks the change against the stored values the form
 * opened on (update-vehicle-usecase).
 */
function vehicleFormRules(
  values: VehicleFormValues,
  changed: readonly VehicleFormField[] | null,
): Partial<Record<VehicleFormField, string>> {
  const touches = (...fields: VehicleFormField[]) =>
    !changed || fields.some((field) => changed.includes(field));

  const issues = vehicleCrossFieldIssues({
    manufacturing_year: parsedField(
      "manufacturing_year",
      values.manufacturing_year,
    ) as string | undefined,
    model_year: parsedField("model_year", values.model_year) as
      string | undefined,
    current_mileage: parsedField("current_mileage", values.current_mileage) as
      number | undefined,
    last_maintenance_mileage: parsedField(
      "last_maintenance_mileage",
      values.last_maintenance_mileage,
    ) as number | null | undefined,
  });

  const result: Partial<Record<VehicleFormField, string>> = {};

  if (issues.model_year && touches("manufacturing_year", "model_year")) {
    result.model_year = issues.model_year;
  }

  if (
    issues.last_maintenance_mileage &&
    touches("current_mileage", "last_maintenance_mileage")
  ) {
    result.last_maintenance_mileage = issues.last_maintenance_mileage;
  }

  return result;
}

/** Who moves the odometer of a saved vehicle, in the company's own modules. */
function lockedMileageHint(
  enabledModules: readonly string[] | null | undefined,
): string {
  if (enabledModules && !enabledModules.includes("FLEET")) {
    return "Depois do cadastro, só o suporte corrige a quilometragem.";
  }

  return "Atualizada pelos abastecimentos, checklists e OS.";
}

export {
  EMPTY_FORM,
  MAINTENANCE_DEFAULTS_WITHOUT_FLEET,
  lockedMileageHint,
  showsMaintenanceFields,
  vehicleCreatePayload,
  VEHICLE_FORM_FIELDS,
  axlesAfterTypeChange,
  changedRelations,
  changedVehicleFields,
  vehicleEditPayload,
  vehicleFormRules,
  vehicleFormSchema,
  vehicleFormValues,
  vehicleRelations,
  yearOf,
  yearOptions,
  yearToDateString,
};
export type { VehicleFormField, VehicleFormValues, VehicleRelations };
