"use client";

import type { ImportData } from "@/actions/import/list-imports";

import { buildImportColumns } from "../imports/table-columns";

import { CatalogTable, type SectionTableProps } from "./section-table";

/** Importações: its own chunk, loaded when the tab renders (index.tsx). */
const ImportsTable = (props: SectionTableProps): JSX.Element => (
  <CatalogTable<ImportData>
    tab="imports"
    columns={buildImportColumns()}
    {...props}
  />
);

export { ImportsTable };
