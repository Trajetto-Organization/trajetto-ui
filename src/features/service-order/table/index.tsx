"use client";

import { useMemo } from "react";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";

import { buildServiceOrderColumns } from "../table-columns";
import { ServiceOrderToolbar } from "../toolbar";
import type { FleetScope } from "../lib/service-order-rules";
import {
  SERVICE_ORDER_TABLE,
  type ServiceOrderRow,
  type ServiceOrderSearchMeta,
} from "../server-table";

interface ServiceOrderTableProps {
  scope: FleetScope;
  data: ServiceOrderRow[];
  meta: { total: number; page: number; pageSize: number };
  responseError: { error: boolean; errorMessage: string };
  searchMeta?: ServiceOrderSearchMeta;
}

/** The list on the server-side table contract (decision 8.8). */
const ServiceOrderTable = ({
  scope,
  data,
  meta,
  responseError,
  searchMeta,
}: ServiceOrderTableProps): JSX.Element => {
  const columns = useMemo(() => buildServiceOrderColumns(scope), [scope]);

  return (
    <DataTable
      data={data}
      meta={meta}
      columns={columns}
      responseError={responseError}
      server={SERVICE_ORDER_TABLE}
      toolbar={<ServiceOrderToolbar facets={searchMeta?.facets} />}
    />
  );
};

export { ServiceOrderTable };
