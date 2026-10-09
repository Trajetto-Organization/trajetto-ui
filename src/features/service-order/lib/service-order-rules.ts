/**
 * What the service order screens derive from a row, in one place.
 *
 * No directive and no imports with side effects: the server content, the
 * client table and the unit tests all read it. The status used to be worked
 * out in five places, and the dashboard called INTERNAL "preventiva" — the
 * type says WHERE the work is done (own workshop or a third party's), not
 * its nature (FLEET-SO-3).
 */

type FleetScope = "admin" | "dashboard";

type MaintenanceType = "INTERNAL" | "EXTERNAL";

type ServiceOrderStatus = "open" | "completed";

const MAINTENANCE_TYPE_LABELS: Readonly<Record<MaintenanceType, string>> = {
  INTERNAL: "Interna",
  EXTERNAL: "Externa",
};

const SERVICE_ORDER_STATUS_LABELS: Readonly<
  Record<ServiceOrderStatus, string>
> = {
  open: "Aberta",
  completed: "Concluída",
};

/** Open until it has a completion date; the one status an order has. */
function serviceOrderStatusOf(row: {
  completion_date?: string | Date | null;
}): ServiceOrderStatus {
  return row.completion_date ? "completed" : "open";
}

/** An amount as the API streams it (a number) or as a legacy row kept it. */
function amountOf(value: number | string | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value === null || value === undefined || value === "") return 0;

  const parsed = Number(String(value).replace(",", "."));

  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * The typed total against the parts (FLEET-SO-2).
 *
 * total_amount stays typed — labour plus parts, as the workshop billed it —
 * and is never recalculated from the lines. The one inconsistency the screen
 * can tell for sure is parts alone costing more than the whole order; it is
 * shown as a warning, never a refusal. Half a cent of slack: both figures
 * are rounded to cents.
 */
function partsExceedTotal(row: {
  total_amount: number | string;
  parts_total?: number | null;
}): boolean {
  if (row.parts_total === null || row.parts_total === undefined) return false;

  return amountOf(row.parts_total) > amountOf(row.total_amount) + 0.005;
}

/**
 * Why an order may not be deleted, or null when it may (FLEET-SO-1). The API
 * decides again under a lock; this only explains the disabled menu item.
 */
function deleteBlockedReason(row: {
  completion_date?: string | Date | null;
  accounts_payable_count?: number | null;
}): string | null {
  const bills = row.accounts_payable_count ?? 0;

  if (bills > 0) {
    return `Há ${bills} conta(s) a pagar vinculada(s) a esta ordem de serviço: excluí-la apagaria a origem delas.`;
  }

  if (serviceOrderStatusOf(row) === "completed") {
    return "Ordem concluída: ela já atualizou a quilometragem e a última manutenção do veículo, que não voltam com a exclusão. Corrija os dados editando a ordem.";
  }

  return null;
}

/**
 * The mileage a finished order may record: equal to the vehicle's is valid
 * (a vehicle that stood in the workshop did not move, FLEET-SO-4); only a
 * reading behind the odometer is wrong. Empty means "not typed yet".
 */
function isMileageAccepted(typed: string, currentMileage: number): boolean {
  if (!typed.trim()) return true;

  const value = Number(typed.replace(",", "."));

  return Number.isFinite(value) && value >= currentMileage;
}

interface EditMileageInput {
  /** What the field holds now. */
  typed: string;
  /** The reading the order has stored ("" when none). */
  stored: string;
  /** The order was already finished when the form opened. */
  wasCompleted: boolean;
  /** The form has a completion date now. */
  isCompleted: boolean;
  /** The order stays on the vehicle it was recorded for. */
  sameVehicle: boolean;
  /** The vehicle's odometer today. */
  currentMileage: number;
  /** The odometer when the order was opened (its snapshot); null on legacy orders. */
  openingMileage?: number | null;
  /**
   * The vehicle's last maintenance reading, when known: it is this order's
   * when it equals the stored reading.
   */
  vehicleLastMaintenanceMileage?: number | null;
}

/** Why the typed reading is refused, when it is. */
type EditMileageRefusal =
  "behind-odometer" | "behind-opening" | "ahead-of-later-maintenance";

interface EditMileageState {
  /** A reading recorded now (finishing, or a correction): judged. */
  isRecordedNow: boolean;
  /** A changed reading of an order already finished, on its own vehicle. */
  isCorrection: boolean;
  /** The lowest reading accepted: the opening one for a correction, else the odometer. */
  floor: number;
  refusal: EditMileageRefusal | null;
  /** Save may go ahead as far as the mileage is concerned. */
  isValid: boolean;
}

const mileageOf = (text: string) => Number(text.replace(",", "."));

/**
 * The edit form's mileage (the API applies the same rule).
 *
 * Only a reading recorded now is judged. Finishing the order: against the
 * odometer (equal is valid, FLEET-SO-4). Correcting the reading of an order
 * already finished: against the order's own opening reading — the odometer
 * moves on after the order (the next fuel-up), and judging a correction by it
 * refused every honest one. A correction past the odometer is refused only
 * when a later maintenance was recorded on the vehicle. The stored reading
 * coming back unchanged is history and is not judged at all.
 */
function editMileageState({
  typed,
  stored,
  wasCompleted,
  isCompleted,
  sameVehicle,
  currentMileage,
  openingMileage,
  vehicleLastMaintenanceMileage,
}: EditMileageInput): EditMileageState {
  const hasTyped = typed.trim() !== "";
  const hasStored = stored.trim() !== "";

  const keepsStored =
    hasTyped &&
    wasCompleted &&
    sameVehicle &&
    hasStored &&
    mileageOf(typed) === mileageOf(stored);

  const isRecordedNow = hasTyped && !keepsStored;
  const isCorrection = isRecordedNow && wasCompleted && sameVehicle;

  const floor = isCorrection ? (openingMileage ?? 0) : currentMileage;

  // Unknown (the vehicle not loaded yet): the API decides.
  const hasLaterMaintenance =
    vehicleLastMaintenanceMileage !== null &&
    vehicleLastMaintenanceMileage !== undefined &&
    (!hasStored || vehicleLastMaintenanceMileage !== mileageOf(stored));

  let refusal: EditMileageRefusal | null = null;

  if (isRecordedNow) {
    if (!isMileageAccepted(typed, floor)) {
      refusal = isCorrection ? "behind-opening" : "behind-odometer";
    } else if (
      isCorrection &&
      hasLaterMaintenance &&
      mileageOf(typed) > currentMileage
    ) {
      refusal = "ahead-of-later-maintenance";
    }
  }

  return {
    isRecordedNow,
    isCorrection,
    floor,
    refusal,
    isValid: !isCompleted || (hasTyped && refusal === null),
  };
}

const kmText = (value: number) => value.toLocaleString("pt-BR");

/** The new mileage's refusal as the field's message (live validation, 16.700). */
function mileageRefusalMessage(
  refusal: EditMileageRefusal | null,
  { floor, currentMileage }: { floor: number; currentMileage: number },
): string | null {
  switch (refusal) {
    case "behind-odometer":
      return `A nova quilometragem não pode ser menor que ${kmText(currentMileage)} km (atual do veículo).`;
    case "behind-opening":
      return `A quilometragem corrigida não pode ser menor que ${kmText(floor)} km (a do veículo na abertura da ordem).`;
    case "ahead-of-later-maintenance":
      return `Há uma manutenção registrada depois desta ordem: a correção não pode passar de ${kmText(currentMileage)} km (atual do veículo).`;
    default:
      return null;
  }
}

/** The fields of the order's last step, in its order: what its submit checks. */
const SERVICE_ORDER_FORM_FIELDS = [
  "date",
  "completion_date",
  "maintenance_type",
  "total_amount",
  "description",
  "current_mileage_at_service",
  "maintenance_interval_km_at_service",
  "last_maintenance_mileage_at_service",
  "new_mileage_after_service",
] as const;

export {
  MAINTENANCE_TYPE_LABELS,
  SERVICE_ORDER_FORM_FIELDS,
  mileageRefusalMessage,
  SERVICE_ORDER_STATUS_LABELS,
  amountOf,
  deleteBlockedReason,
  editMileageState,
  isMileageAccepted,
  partsExceedTotal,
  serviceOrderStatusOf,
  type EditMileageInput,
  type EditMileageRefusal,
  type EditMileageState,
  type FleetScope,
  type MaintenanceType,
  type ServiceOrderStatus,
};
