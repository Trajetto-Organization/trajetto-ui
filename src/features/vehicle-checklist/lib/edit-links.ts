/**
 * The links a checklist edit sends (FLEET-FUEL-1, the checklist half).
 *
 * The edit posted every link — branch, vehicle, driver — even untouched, and
 * the API held each one to today's state: last month's checklist of a driver
 * who has since left, or at a branch since closed, could not have a note
 * corrected. Only a link the person actually changed goes out now (the API
 * also stopped re-checking unchanged ones). No directive: pure, and tested.
 */
interface ChecklistLinks {
  branchId: string;
  vehicleId: string;
  driverId: string;
}

function changedChecklistLinks(
  original: Partial<ChecklistLinks>,
  selected: Partial<ChecklistLinks>,
): Partial<ChecklistLinks> {
  const changed: Partial<ChecklistLinks> = {};

  for (const key of ["branchId", "vehicleId", "driverId"] as const) {
    const value = selected[key];

    // An empty selection is not "clear the link": every checklist has all three.
    if (value && value !== original[key]) changed[key] = value;
  }

  return changed;
}

export { changedChecklistLinks };
export type { ChecklistLinks };
