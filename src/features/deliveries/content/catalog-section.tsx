"use client";

import { useCompleteList } from "@/app/(protected)/_components/shared/tanstack-table/data-table/use-complete-list";

import { CATALOG_TABLES } from "../lib/catalog-tables";
import {
  CATALOG_LOCAL,
  CATALOG_SUMMARIES,
  type LocalCatalogTab,
} from "../lib/catalog-local";
import { DeliveriesStats } from "../stats";
import { DeliveriesTable } from "../table";

interface DeliveriesCatalogSectionProps {
  activeTab: LocalCatalogTab;
  data: unknown[];
  meta: { total: number; page: number; pageSize: number };
  responseError: { error: boolean; errorMessage: string };
  searchMeta?: Record<string, unknown>;
  /** The key of a complete read (list-read), absent for the server's page. */
  complete?: string;
}

/**
 * The cards and the table of Embarcadores, Tipos de ocorrência and Motivos,
 * over one list query (spec §13). When the read brought the whole set, the
 * filters, the date sorts and the pages are answered here and the cards
 * follow the same selection; otherwise both show the server's answer, as
 * on every other tab. Always this component for these tabs, so a read that
 * turns complete (or stops being) never remounts the table.
 */
function DeliveriesCatalogSection({
  activeTab,
  data,
  meta,
  responseError,
  searchMeta,
  complete,
}: DeliveriesCatalogSectionProps): JSX.Element {
  const list = useCompleteList({
    rows: data,
    meta,
    searchMeta,
    complete,
    spec: CATALOG_TABLES[activeTab],
    local: CATALOG_LOCAL[activeTab],
    summarize: CATALOG_SUMMARIES[activeTab],
  });

  return (
    <>
      <DeliveriesStats
        activeTab={activeTab}
        total={list.meta.total}
        searchMeta={list.searchMeta}
      />

      <DeliveriesTable
        activeTab={activeTab}
        data={list.rows}
        meta={list.meta}
        responseError={responseError}
        searchMeta={list.searchMeta}
        catalogServerMode
        listQuery={list.listQuery}
      />
    </>
  );
}

export { DeliveriesCatalogSection };
