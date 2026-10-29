import {
  assertServerTableSpec,
  serverTableQuery,
  type FacetCount,
  type ServerTableSpec,
} from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

/**
 * The checklist table's server contract (decision 8.8): sort keys and facet
 * params of trajetto-api usecases/list-vehicle-checklist/checklist-list.ts;
 * the column ids match them.
 */
const CHECKLIST_CONDITION_LABELS = {
  approved: "Aprovado",
  approved_with_restrictions: "Aprovado com restrições",
  rejected: "Reprovado",
} as const;

const CHECKLIST_TABLE: ServerTableSpec = assertServerTableSpec({
  sortable: [
    "created_at",
    "checklist_date",
    "current_mileage",
    "overall_condition",
    "vehicle_license_plate",
    "vehicle_description",
    "driver_name",
    "branchName",
  ],
  defaultSort: { id: "created_at", desc: true },
  facets: {
    overall_condition: {
      param: "overall_condition",
      values: Object.keys(CHECKLIST_CONDITION_LABELS),
    },
    branchName: { param: "branchId", values: "uuid" },
    vehicle_license_plate: { param: "vehicleId", values: "uuid" },
  },
});

/** The listing's `meta.searchMeta`, as the API streams it. */
interface ChecklistSearchMeta {
  /** Every filter but the condition one: the base of the cards. */
  total?: number;
  approved?: number;
  approvedWithRestrictions?: number;
  rejected?: number;
  facets?: {
    overall_condition?: FacetCount[];
    branchId?: FacetCount[];
    vehicleId?: FacetCount[];
  };
}

function checklistListQuery(
  searchParams: Record<string, string | string[] | undefined>,
): Record<string, string> {
  return serverTableQuery(searchParams, CHECKLIST_TABLE);
}

export {
  CHECKLIST_CONDITION_LABELS,
  CHECKLIST_TABLE,
  checklistListQuery,
  type ChecklistSearchMeta,
};
