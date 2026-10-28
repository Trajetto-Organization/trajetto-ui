import {
  CREATED_THEN_ID,
  assertLocalTableSpec,
  type LocalSelection,
  type LocalTableSpec,
} from "@/app/(protected)/_components/shared/tanstack-table/data-table/local-table";
import type { FacetCount } from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import {
  BRANCH_STATUSES,
  BRANCH_TABLE,
  BRAZILIAN_UFS,
  type BranchRow,
  type BranchSearchMeta,
} from "./server-table";

/**
 * Filiais answered in the browser when the company's whole set (for the
 * search) is on screen (spec §13, data-table/local-table). Status and UF
 * filter as the API groups them; the browser orders by the dates and by the
 * status (a boolean), never by a text column, whose order is the database
 * collation's. No directive: the server read computes the same key.
 */
const BRANCH_LOCAL: LocalTableSpec = assertLocalTableSpec(BRANCH_TABLE, {
  facets: {
    is_active: { field: "is_active", read: "active" },
    uf: { field: "uf", read: "value" },
  },
  sorts: {
    created_at: { field: "created_at", kind: "instant" },
    updated_at: { field: "updated_at", kind: "instant" },
    is_active: { field: "is_active", kind: "boolean" },
  },
  tiebreaker: CREATED_THEN_ID,
});

/**
 * The cards and both facets' options the API would send for this selection:
 * a port of trajetto-api summarizeBranchList over the rows (one per group),
 * plus the trade-name count its repository takes over the filtered set
 * (`fantasy_name` not NULL and not ""), and `withErpCode` as Prisma's
 * `_count` of the column (not NULL).
 */
function summarizeBranches(
  rows: readonly BranchRow[],
  selection: LocalSelection,
  base: BranchSearchMeta | undefined,
): BranchSearchMeta {
  const statuses = selection.status;
  const statusFilter = statuses?.length === 1 ? statuses[0] : undefined;
  const ufFilter = selection.uf?.length ? new Set(selection.uf) : null;

  const matchesStatus = (row: BranchRow) =>
    !statusFilter || row.is_active === (statusFilter === "active");
  const matchesUf = (row: BranchRow) => !ufFilter || ufFilter.has(row.uf);

  const kept = rows.filter((row) => matchesStatus(row) && matchesUf(row));

  // Each facet counted with the OTHER one applied, never itself.
  const forStatus = rows.filter(matchesUf);
  const status: FacetCount[] = BRANCH_STATUSES.map((value) => ({
    value,
    count: forStatus.filter((row) => row.is_active === (value === "active"))
      .length,
  }));

  const byUf = new Map<string, number>();

  for (const row of rows.filter(matchesStatus)) {
    byUf.set(row.uf, (byUf.get(row.uf) ?? 0) + 1);
  }

  // Every UF present, plus a selected one that has zero now.
  const uf: FacetCount[] = BRAZILIAN_UFS.filter(
    (value) => (byUf.get(value) ?? 0) > 0 || ufFilter?.has(value),
  ).map((value) => ({ value, count: byUf.get(value) ?? 0 }));

  return {
    ...base,
    total: kept.length,
    active: forStatus.filter((row) => row.is_active).length,
    withErpCode: kept.filter(
      (row) => row.erp_code !== null && row.erp_code !== undefined,
    ).length,
    withFantasyName: kept.filter(
      (row) =>
        row.fantasy_name !== null &&
        row.fantasy_name !== undefined &&
        row.fantasy_name !== "",
    ).length,
    facets: { status, uf },
  };
}

export { BRANCH_LOCAL, summarizeBranches };
