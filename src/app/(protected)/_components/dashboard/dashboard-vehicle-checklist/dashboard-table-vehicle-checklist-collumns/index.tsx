"use client";

import { buildVehicleChecklistColumns } from "@/features/vehicle-checklist/table-columns";
import { DataTableVehicleChecklistRowActions } from "../dashboard-data-table-row-actions";

/**
 * Thin binding of the unified checklist table to the dashboard route: only
 * the row actions are route-specific. The columns live in
 * `features/vehicle-checklist` — do not grow route-specific columns here.
 */
const dashboardTableVehicleChecklistColumns = buildVehicleChecklistColumns({
  renderRowActions: (row) => <DataTableVehicleChecklistRowActions row={row} />,
});

export { dashboardTableVehicleChecklistColumns };
