"use client";

import { useMemo } from "react";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";

import {
  SUPPLIER_TABLE,
  type SupplierRow,
  type SupplierSearchMeta,
} from "../lib/server-table";
import { buildSupplierColumns } from "./columns";
import { SupplierToolbar } from "./toolbar";

interface SupplierTableProps {
  data: SupplierRow[];
  meta: { total: number; page: number; pageSize: number };
  responseError: { error: boolean; errorMessage: string };
  searchMeta?: SupplierSearchMeta;
}

/**
 * Suppliers on the server-side table contract: order, the UF filter and the
 * pager answered by the API for the whole company.
 */
const SupplierTable = ({
  data,
  meta,
  responseError,
  searchMeta,
}: SupplierTableProps): JSX.Element => {
  const columns = useMemo(buildSupplierColumns, []);

  return (
    <DataTable
      data={data}
      meta={meta}
      columns={columns}
      responseError={responseError}
      server={SUPPLIER_TABLE}
      toolbar={<SupplierToolbar facets={searchMeta?.facets} />}
    />
  );
};

export { SupplierTable };
