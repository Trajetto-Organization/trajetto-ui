"use client";

import { useMemo } from "react";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";

import type { FleetScope } from "../../lib/service-order-rules";

import { buildOrderPartColumns } from "../table-columns";
import { OrderPartToolbar } from "../toolbar";
import { ORDER_PART_TABLE } from "../server-table";
import type {
  OrderPartRow,
  OrderPartSearchMeta,
} from "../lib/order-part-rules";

const OrderPartTable = ({
  scope,
  data,
  meta,
  responseError,
  searchMeta,
}: {
  scope: FleetScope;
  data: OrderPartRow[];
  meta: { total: number; page: number; pageSize: number };
  responseError: { error: boolean; errorMessage: string };
  searchMeta?: OrderPartSearchMeta;
}): JSX.Element => {
  const columns = useMemo(() => buildOrderPartColumns(scope), [scope]);

  return (
    <DataTable
      data={data}
      meta={meta}
      columns={columns}
      responseError={responseError}
      server={ORDER_PART_TABLE}
      toolbar={<OrderPartToolbar facets={searchMeta?.facets} />}
      // The facet behind "Ver Peças da Ordem" needs the column; the reference
      // itself is noise in the default view.
      initialColumnVisibility={{ serviceOrderId: false }}
    />
  );
};

export { OrderPartTable };
