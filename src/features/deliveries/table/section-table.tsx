"use client";

import { createElement } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";

import { CATALOG_TABLES, type CatalogSearchMeta } from "../lib/catalog-tables";
import { DeliveriesTableToolbar } from "../table-toolbar";

/** What every section's table receives from the page (table/index.tsx). */
interface SectionTableProps {
  data: unknown[];
  meta: { total: number; page: number; pageSize: number };
  responseError: { error: boolean; errorMessage: string };
  /** The NDJSON meta line's `searchMeta`: filter options and counts. */
  searchMeta?: Record<string, unknown>;
  /**
   * The page forwards the catalog tabs' sort and filter params: the table
   * then answers on the server too (decision 8.8).
   */
  catalogServerMode?: boolean;
}

type CatalogTableTab = keyof typeof CATALOG_TABLES;

/**
 * Embarcadores, Importações, Tipos de Ocorrência and Motivos de Status: the
 * same table with each one's columns. Each tab's module (table/<tab>.tsx)
 * passes its own, so opening one never downloads the others' columns, row
 * menus and dialogs.
 */
function CatalogTable<TData>({
  tab,
  columns,
  data,
  meta,
  responseError,
  searchMeta,
  catalogServerMode = false,
}: SectionTableProps & {
  tab: CatalogTableTab;
  columns: ColumnDef<TData, unknown>[];
}): JSX.Element {
  // Without the server mode the filters would show a chip over a list the
  // request did not filter, so they keep filtering the loaded page.
  const toolbar = createElement(DeliveriesTableToolbar, {
    activeTab: tab,
    catalogFacets: catalogServerMode
      ? ((searchMeta as CatalogSearchMeta | undefined)?.facets ?? {})
      : undefined,
  });

  return (
    <DataTable
      data={data as TData[]}
      meta={meta}
      columns={columns}
      responseError={responseError}
      toolbar={toolbar}
      {...(catalogServerMode && { server: CATALOG_TABLES[tab] })}
    />
  );
}

export { CatalogTable, type SectionTableProps };
