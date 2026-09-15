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
import { buildOccurrenceColumns } from "../occurrences/table-columns";

import type { StatusChangeReasonData } from "@/actions/status-change-reason/list-status-change-reason";
import type { ImportData } from "@/actions/import/list-imports";

import { buildStatusChangeReasonColumns } from "../status-change-reasons/table-columns";
import { buildImportColumns } from "../imports/table-columns";

import type { OccurrenceRow } from "../lib/panels";
import { DeliveriesTableToolbar } from "../table-toolbar";

interface DeliveriesTableProps {
  activeTab: DeliveryTab;
  data: unknown[];
  meta: { total: number; page: number; pageSize: number };
  responseError: { error: boolean; errorMessage: string };
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
}: DeliveriesTableProps): JSX.Element => {
  const toolbar = createElement(DeliveriesTableToolbar, { activeTab });

  if (activeTab === "shippers") {
    return (
      <DataTable
        data={data as ShipperData[]}
        meta={meta}
        columns={buildShipperColumns()}
        responseError={responseError}
        toolbar={toolbar}
      />
    );
  }

  if (activeTab === "occurrences") {
    return (
      <DataTable
        data={data as OccurrenceRow[]}
        meta={meta}
        columns={buildOccurrenceColumns()}
        responseError={responseError}
        toolbar={toolbar}
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
    />
  );
};

export { DeliveriesTable };
