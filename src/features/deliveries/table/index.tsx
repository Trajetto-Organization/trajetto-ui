"use client";

import { createElement } from "react";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";

import type { DeliveryListItem } from "@/actions/delivery/get-delivery";
import type { ShipperData } from "@/actions/shipper/list-shipper";

import type { OccurrenceTypeData } from "@/actions/occurrence-type/list-occurrence-type";
import type { DeliveryTab } from "../lib/tabs";

import { buildDeliveryColumns } from "../deliveries/table-columns";
import { buildShipperColumns } from "../shippers/table-columns";

import { buildOccurrenceTypeColumns } from "../occurrence-types/table-columns";

import type { StatusChangeReasonData } from "@/actions/status-change-reason/list-status-change-reason";
import type { ImportData } from "@/actions/import/list-imports";

import { buildStatusChangeReasonColumns } from "../status-change-reasons/table-columns";
import { buildImportColumns } from "../imports/table-columns";

import type { OccurrenceRow } from "../lib/panels";
import { DeliveriesTableToolbar } from "../table-toolbar";

import { OccurrencesTable } from "../occurrences/table";
import type { OccurrenceFeedSearchMeta } from "../occurrences/server-table";
import {
  DELIVERY_TABLE,
  type DeliveryListSearchMeta,
} from "../deliveries/server-table";
import {
  CATALOG_TABLES,
  isCatalogTab,
  type CatalogSearchMeta,
} from "../lib/catalog-tables";

interface DeliveriesTableProps {
  activeTab: DeliveryTab;
  data: unknown[];
  meta: { total: number; page: number; pageSize: number };
  responseError: { error: boolean; errorMessage: string };
  /**
   * The NDJSON meta line's `searchMeta`: the filter options and counts. The
   * page always forwards the URL's sort and filter params
   * (`deliveriesListQuery` / `occurrencesListQuery`), so the deliveries and
   * occurrences tables are always answered on the server (decision 8.8);
   * without it (a failed read) the filters simply have no counts.
   */
  searchMeta?: Record<string, unknown>;
  /**
   * The page forwards the catalog tabs' sort and filter params
   * (`deliveryTabListQuery`): Embarcadores, Tipos, Motivos and Importações
   * are then answered on the server too. Without it they keep filtering the
   * loaded page, because a filter the request does not carry would show a
   * chip over an unfiltered table.
   */
  catalogServerMode?: boolean;
}

/**
 * Rows come from the server; each tab picks its column set. What the viewer
 * may do is decided inside the actions cell, which reads the session directly
 * so a permission change redraws the row without rebuilding the table.
 */
const DeliveriesTable = ({
  activeTab,
  data,
  meta,
  responseError,
  searchMeta,
  catalogServerMode = false,
}: DeliveriesTableProps): JSX.Element => {
  const catalogServer = catalogServerMode && isCatalogTab(activeTab);

  const toolbar = createElement(DeliveriesTableToolbar, {
    activeTab,
    serverFacets:
      activeTab === "deliveries"
        ? ((searchMeta as DeliveryListSearchMeta | undefined)?.facets ?? {})
        : undefined,
    catalogFacets: catalogServer
      ? ((searchMeta as CatalogSearchMeta | undefined)?.facets ?? {})
      : undefined,
  });

  const catalogSpec = catalogServer
    ? { server: CATALOG_TABLES[activeTab as keyof typeof CATALOG_TABLES] }
    : {};

  if (activeTab === "shippers") {
    return (
      <DataTable
        data={data as ShipperData[]}
        meta={meta}
        columns={buildShipperColumns()}
        responseError={responseError}
        toolbar={toolbar}
        {...catalogSpec}
      />
    );
  }

  if (activeTab === "occurrences") {
    return (
      <OccurrencesTable
        data={data as OccurrenceRow[]}
        meta={meta}
        responseError={responseError}
        searchMeta={searchMeta as OccurrenceFeedSearchMeta | undefined}
      />
    );
  }

  if (activeTab === "occurrence-types") {
    return (
      <DataTable
        data={data as OccurrenceTypeData[]}
        meta={meta}
        columns={buildOccurrenceTypeColumns()}
        responseError={responseError}
        toolbar={toolbar}
        {...catalogSpec}
      />
    );
  }

  if (activeTab === "status-change-reasons") {
    return (
      <DataTable
        data={data as StatusChangeReasonData[]}
        meta={meta}
        columns={buildStatusChangeReasonColumns()}
        responseError={responseError}
        toolbar={toolbar}
        {...catalogSpec}
      />
    );
  }

  if (activeTab === "imports") {
    return (
      <DataTable
        data={data as ImportData[]}
        meta={meta}
        columns={buildImportColumns()}
        responseError={responseError}
        toolbar={toolbar}
        {...catalogSpec}
      />
    );
  }

  return (
    <DataTable
      data={data as DeliveryListItem[]}
      meta={meta}
      columns={buildDeliveryColumns()}
      responseError={responseError}
      toolbar={toolbar}
      server={DELIVERY_TABLE}
    />
  );
};

export { DeliveriesTable };
