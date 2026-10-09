import type { CnhCategory } from "@/schemas/create-update-vehicle-type-schema";

import type { VehicleTypeRow } from "../types";

/**
 * The vehicle-type form's values and what an edit sends: only what changed,
 * with "" meaning "no required category" (decision 8.5). Pure, tested.
 */
interface VehicleTypeFormValues {
  description: string;
  number_of_axles: string;
  /** "" = not configured. */
  required_cnh_category: CnhCategory | "";
}

const EMPTY_VEHICLE_TYPE: VehicleTypeFormValues = {
  description: "",
  number_of_axles: "",
  required_cnh_category: "",
};

function vehicleTypeFormValues(type: VehicleTypeRow): VehicleTypeFormValues {
  return {
    description: type.description,
    number_of_axles: String(type.number_of_axles),
    required_cnh_category: type.required_cnh_category ?? "",
  };
}

function vehicleTypeEditPayload(
  initial: VehicleTypeFormValues,
  current: VehicleTypeFormValues,
): Record<string, string> {
  const payload: Record<string, string> = {};

  if (current.description.trim() !== initial.description.trim()) {
    payload.description = current.description;
  }

  if (Number(current.number_of_axles) !== Number(initial.number_of_axles)) {
    payload.number_of_axles = current.number_of_axles;
  }

  if (current.required_cnh_category !== initial.required_cnh_category) {
    payload.required_cnh_category = current.required_cnh_category;
  }

  return payload;
}

/** How the category reads: the class and what it lets a driver drive. */
const CNH_CATEGORY_LABELS: Record<CnhCategory, string> = {
  A: "A — motos",
  B: "B — carros e utilitários leves",
  C: "C — caminhões (acima de 3,5 t)",
  D: "D — ônibus e vans de passageiros",
  E: "E — combinações (carretas, bitrens)",
  AB: "AB",
  AC: "AC",
  AD: "AD",
  AE: "AE",
};

export {
  CNH_CATEGORY_LABELS,
  EMPTY_VEHICLE_TYPE,
  vehicleTypeEditPayload,
  vehicleTypeFormValues,
};
export type { VehicleTypeFormValues };
