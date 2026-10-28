/**
 * How full a company's contracted fleet is — one rule for every screen that
 * shows it: the master's vehicle-limit form and the "Veículos" card of
 * Limites de Uso. Pure, and tested.
 *
 * A slot is occupied by every vehicle that is not INACTIVE (the API's
 * occupiesFleetSlot); a limit of 0 means "not configured" and never blocks.
 * The count can pass the limit: the master may lower the contract below the
 * fleet, and nothing is deleted or blocked when that happens.
 */

/**
 * From this share of the contract on, the fleet is "Uso elevado". The admin
 * form has warned at 80% since it was written; the AI quota card keeps its
 * own 70% (a monthly quota that runs out by itself, a different decision).
 */
const VEHICLE_SLOT_HIGH_USAGE_PERCENT = 80;

type VehicleSlotLevel = "unlimited" | "ok" | "high" | "full" | "over";

/** The share of the contract in use, capped at 100 for a progress bar. */
function vehicleSlotPercent(count: number, limit: number): number {
  if (limit <= 0) return 0;

  return Math.min((count / limit) * 100, 100);
}

function vehicleSlotLevel(count: number, limit: number): VehicleSlotLevel {
  if (limit <= 0) return "unlimited";
  if (count > limit) return "over";
  if (count === limit) return "full";

  return (count / limit) * 100 >= VEHICLE_SLOT_HIGH_USAGE_PERCENT
    ? "high"
    : "ok";
}

export {
  VEHICLE_SLOT_HIGH_USAGE_PERCENT,
  vehicleSlotLevel,
  vehicleSlotPercent,
};
export type { VehicleSlotLevel };
