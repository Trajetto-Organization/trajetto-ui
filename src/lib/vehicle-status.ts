import type { SelectOption } from "@/app/(protected)/_components/shared/custom/shared/common.types";

type VehicleStatus = "ACTIVE" | "INACTIVE" | "BLOCKED" | "IN_ROUTE";

const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
  BLOCKED: "Bloqueado",
  IN_ROUTE: "Em rota",
};

/**
 * The three states a person actually decides.
 *
 * "Em rota" is not one of them. It is written by the route when the driver
 * departs and cleared when the route ends; the API refuses it as a change
 * (VEHICLE_STATUS_DERIVED), so offering it would only produce a form that
 * fails on save.
 */
const CHOOSABLE_VEHICLE_STATUSES: VehicleStatus[] = [
  "ACTIVE",
  "INACTIVE",
  "BLOCKED",
];

/**
 * What the status dropdown offers, given the status the vehicle HAS — the
 * persisted one, never the value being edited (FLEET-VEH-4).
 *
 * It used to be derived from the form's own value: on a truck that was out,
 * choosing "Ativo" made the "Em rota" option disappear, and there was no way
 * back short of closing the modal.
 *
 * On a vehicle that is out, the current value is shown, locked, so the field
 * is not blank on a truck that is genuinely on the road; and the only change
 * offered is BLOCKED (theft, crash, breakdown), because while the route runs
 * the API refuses ACTIVE and INACTIVE (VEHICLE_IN_ACTIVE_ROUTE, decision 8.3).
 */
function vehicleStatusOptions(
  persisted?: string | number | null,
): SelectOption[] {
  if (persisted !== "IN_ROUTE") {
    return CHOOSABLE_VEHICLE_STATUSES.map((status) => ({
      value: status,
      label: VEHICLE_STATUS_LABELS[status],
    }));
  }

  return [
    {
      value: "IN_ROUTE",
      label: "Em rota (definido pela rota)",
      disabled: true,
    },
    { value: "BLOCKED", label: VEHICLE_STATUS_LABELS.BLOCKED },
  ];
}

/** "Em rota", "Ativo"… for a vehicle status as the API sends it. */
function vehicleStatusLabel(status: string | null | undefined): string {
  return (
    VEHICLE_STATUS_LABELS[(status ?? "") as VehicleStatus] ?? (status || "—")
  );
}

interface ResponsibleInput {
  /** Vehicle.driverId: its responsible (fixed) driver. */
  vehicleDriverId: string | null | undefined;
  /** The responsible's name, when the row carries it. */
  vehicleDriverName: string | null | undefined;
  /** The driver being assigned. */
  chosenDriverId: string | null | undefined;
}

/**
 * The line under a vehicle in the picker: whose truck it is, said relative to
 * the driver being assigned — "their own" is what the dispatcher looks for.
 */
function responsibleLabel({
  vehicleDriverId,
  vehicleDriverName,
  chosenDriverId,
}: ResponsibleInput): string | null {
  if (!vehicleDriverId) return null;

  if (chosenDriverId && vehicleDriverId === chosenDriverId) {
    return "Responsável: o motorista escolhido";
  }

  return vehicleDriverName
    ? `Responsável: ${vehicleDriverName}`
    : "Responsável: outro motorista";
}

export {
  CHOOSABLE_VEHICLE_STATUSES,
  VEHICLE_STATUS_LABELS,
  responsibleLabel,
  vehicleStatusLabel,
  vehicleStatusOptions,
};
export type { ResponsibleInput, VehicleStatus };
