// The vehicle row helpers live with the status labels, so the shared vehicle
// picker does not depend on this feature; re-exported for the route dialogs.
import {
  responsibleLabel,
  vehicleStatusLabel,
  type ResponsibleInput,
} from "@/lib/vehicle-status";

/**
 * The decisions the assignment dialogs make about a driver/vehicle pair
 * (FLEET-ASSIGN-2), kept pure so they are tested without rendering.
 */

interface PreselectInput {
  /** The driver's only responsible vehicle, as the API suggests it. */
  suggestedVehicleId: string | null | undefined;
  currentVehicleId: string;

  /**
   * Whether the person picked a vehicle for this driver themselves (or the
   * dialog opened with one). A choice somebody made is never overwritten.
   */
  vehicleTouched: boolean;
}

/**
 * The vehicle to preselect when a driver is chosen, or null to leave the
 * field alone: the driver's own truck, only when there is exactly one and
 * nobody has chosen another.
 */
function vehicleToPreselect({
  suggestedVehicleId,
  currentVehicleId,
  vehicleTouched,
}: PreselectInput): string | null {
  if (vehicleTouched || !suggestedVehicleId) return null;

  return currentVehicleId === suggestedVehicleId ? null : suggestedVehicleId;
}

interface SuggestionInput {
  /** The preview's suggestion: the driver's only responsible vehicle. */
  suggestedVehicleId: string | null | undefined;
  /** Editing an existing route (not planning or assigning a new one). */
  isEditing: boolean;
  driverId: string;
  /** The driver the route had when the edit dialog opened. */
  initialDriverId: string;
}

/**
 * The suggestion a dialog may apply, or null. Editing a route never fills
 * the vehicle by itself while the driver is still the route's own: opening
 * "Editar rota" on a route without a vehicle used to fill the driver's
 * truck, which made the untouched form dirty (decision 2.5) and slipped the
 * vehicle into any other edit. Choosing ANOTHER driver is a new pair, and
 * then the new driver's own truck is offered like anywhere else.
 */
function suggestionToApply({
  suggestedVehicleId,
  isEditing,
  driverId,
  initialDriverId,
}: SuggestionInput): string | null {
  if (!suggestedVehicleId) return null;
  if (isEditing && driverId === initialDriverId) return null;

  return suggestedVehicleId;
}

/**
 * The zone the plan's day rules are read in: the company's, as the
 * assignment preview answers it, and the browser's until it has — the same
 * zone for a dispatcher working from the company's own city.
 */
function planTimeZone(companyTimeZone: string | null | undefined): string {
  return companyTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export {
  planTimeZone,
  responsibleLabel,
  suggestionToApply,
  vehicleStatusLabel,
  vehicleToPreselect,
};
export type { PreselectInput, ResponsibleInput, SuggestionInput };
