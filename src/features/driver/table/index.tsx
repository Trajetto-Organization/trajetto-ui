"use client";

import { useMemo } from "react";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";

import type { DriverListSearchMeta, DriverScope } from "../lib/driver-rules";
import { DRIVER_TABLE } from "../server-table";
import type { DriverListMeta, DriverRow } from "../types";

import { buildDriverColumns } from "./columns";
import { DriverToolbar } from "./toolbar";

interface DriversTableProps {
  mode: DriverScope;
  data: DriverRow[];
  meta: DriverListMeta;
  responseError: { error: boolean; errorMessage: string };
  /** The NDJSON meta line's `searchMeta`: cards and filter options. */
  searchMeta?: DriverListSearchMeta;
}

/**
 * The driver list on the server-side table contract: order, filters and pager
 * all answered by the API for the whole company. The page forwards the URL's
 * sort and filter params with `driverListQuery`.
 */
const DriversTable = ({
  mode,
  data,
  meta,
  responseError,
  searchMeta,
}: DriversTableProps): JSX.Element => {
  const columns = useMemo(() => buildDriverColumns(mode), [mode]);

  return (
    <DataTable
      data={data}
      meta={meta}
      columns={columns}
      responseError={responseError}
      server={DRIVER_TABLE}
      toolbar={<DriverToolbar facets={searchMeta?.facets} />}
    />
  );
};

export { DriversTable };
