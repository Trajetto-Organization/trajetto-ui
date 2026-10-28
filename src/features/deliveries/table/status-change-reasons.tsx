"use client";

import type { StatusChangeReasonData } from "@/actions/status-change-reason/list-status-change-reason";

import { buildStatusChangeReasonColumns } from "../status-change-reasons/table-columns";

import { CatalogTable, type SectionTableProps } from "./section-table";

/** Motivos de Status: its own chunk, loaded when the tab renders (index.tsx). */
const StatusChangeReasonsTable = (props: SectionTableProps): JSX.Element => (
  <CatalogTable<StatusChangeReasonData>
    tab="status-change-reasons"
    columns={buildStatusChangeReasonColumns()}
    {...props}
  />
);

export { StatusChangeReasonsTable };
