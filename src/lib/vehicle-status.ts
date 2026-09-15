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
 * departs and cleared when the route ends, and until recently it was an option
 * in this dropdown that nothing ever cleared — true until the truck came back
 * and somebody remembered to change it. The API now refuses it as a change
 * (VEHICLE_STATUS_DERIVED), so offering it here would only produce a form that
 * fails on save.
 */
const CHOOSABLE_VEHICLE_STATUSES: VehicleStatus[] = [
  "ACTIVE",
  "INACTIVE",
  "BLOCKED",
];

/**
 * What the status dropdown offers, given what the vehicle holds right now.
 *
 * On a vehicle that IS out, the current value is shown — disabled — rather
 * than omitted. Omitting it leaves the field blank on a truck that is
 * genuinely on the road, which reads as data loss and invites the user to pick
 * something else just to make the form look right. Shown and locked, it says
 * what is true and why it cannot be touched.
 *
 * The three states a person owns keep working either way, including on a
 * vehicle that is out: blocking a truck after a crash is exactly when somebody
 * needs to.
 */
function vehicleStatusOptions(
  current?: string | number | null,
): SelectOption[] {
  const choosable = CHOOSABLE_VEHICLE_STATUSES.map((status) => ({
    value: status,
    label: VEHICLE_STATUS_LABELS[status],
  }));

  if (current !== "IN_ROUTE") return choosable;

  return [
    ...choosable,
    {
      value: "IN_ROUTE",
      label: "Em rota (definido pela rota)",
      disabled: true,
    },
  ];
}

export {
  CHOOSABLE_VEHICLE_STATUSES,
  VEHICLE_STATUS_LABELS,
  vehicleStatusOptions,
};
export type { VehicleStatus };
