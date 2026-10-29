"use client";

import { createElement } from "react";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";

import type { DeliveryListItem } from "@/actions/delivery/get-delivery";

import { buildDeliveryColumns } from "../deliveries/table-columns";
import {
  DELIVERY_TABLE,
  type DeliveryListSearchMeta,
} from "../deliveries/server-table";
import { DeliveriesTableToolbar } from "../table-toolbar";
import { DeliveriesBulkActions } from "../table-toolbar/bulk-actions";

import type { SectionTableProps } from "./section-table";

/**
 * The deliveries list: its own chunk, loaded when the tab renders
 * (index.tsx). Always answered on the server (decision 8.8): the page
 * forwards the URL's sort, facets and period.
 */
const DeliveryListTable = ({
  data,
  meta,
  responseError,
  searchMeta,
}: SectionTableProps): JSX.Element => {
  const listMeta = searchMeta as DeliveryListSearchMeta | undefined;

  const toolbar = createElement(DeliveriesTableToolbar, {
    activeTab: "deliveries",
    serverFacets: listMeta?.facets ?? {},
    periodMeta: listMeta?.period,
  });

  return (
    <DataTable
      data={data as DeliveryListItem[]}
      meta={meta}
      columns={buildDeliveryColumns()}
      responseError={responseError}
      toolbar={toolbar}
      server={DELIVERY_TABLE}
      // The Tipo column carries the filter; the badge in Código is the
      // compact way to read it (deliveries/table-columns).
      initialColumnVisibility={{ kind: false }}
      // The one list with a batch ("Adicionar à rota"), so the one with
      // checkboxes.
      bulkActions={{
        dataTutorial: "deliveries-select-all",
        render: (selection) => <DeliveriesBulkActions {...selection} />,
      }}
    />
  );
};

export { DeliveryListTable };
