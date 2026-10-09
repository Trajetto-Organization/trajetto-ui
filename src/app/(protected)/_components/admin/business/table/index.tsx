"use client";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";

import type { BusinessProps } from "@/app/(protected)/_components/shared/common.types";

import { BusinessToolbar } from "../business-toolbar";
import { BUSINESS_TABLE, type BusinessSearchMeta } from "../lib/server-table";
import { tableBusinessCollumns } from "../table-business-collumns";

interface BusinessTableProps {
  data: BusinessProps[];
  meta: { total: number; page: number; pageSize: number };
  responseError: { error: boolean; errorMessage: string };
  searchMeta?: BusinessSearchMeta;
}

/**
 * Companies on the server-side table contract: order, the status and UF
 * filters and the pager answered by the API over every company.
 */
const BusinessTable = ({
  data,
  meta,
  responseError,
  searchMeta,
}: BusinessTableProps): JSX.Element => (
  <DataTable
    data={data}
    meta={meta}
    columns={tableBusinessCollumns}
    responseError={responseError}
    server={BUSINESS_TABLE}
    toolbar={<BusinessToolbar facets={searchMeta?.facets} />}
  />
);

export { BusinessTable };
