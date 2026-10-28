"use client";

import type { OccurrenceTypeData } from "@/actions/occurrence-type/list-occurrence-type";

import { buildOccurrenceTypeColumns } from "../occurrence-types/table-columns";

import { CatalogTable, type SectionTableProps } from "./section-table";

/**
 * Tipos de Ocorrência: its own chunk, loaded when the tab renders
 * (index.tsx). Its row menu brings the form builder along, the heaviest
 * dialog of the module.
 */
const OccurrenceTypesTable = (props: SectionTableProps): JSX.Element => (
  <CatalogTable<OccurrenceTypeData>
    tab="occurrence-types"
    columns={buildOccurrenceTypeColumns()}
    {...props}
  />
);

export { OccurrenceTypesTable };
