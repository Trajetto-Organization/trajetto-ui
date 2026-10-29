"use client";

import { useMemo } from "react";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";
import type { FuelProps } from "@/app/(protected)/_components/shared/common.types";

import { FUEL_TABLE, type FuelListSearchMeta } from "../lib/server-table";
import { buildFuelColumns } from "./columns";
import { FuelToolbar } from "./toolbar";

interface FuelTableProps {
  data: FuelProps[];
  meta: { total: number; page: number; pageSize: number };
  responseError: { error: boolean; errorMessage: string };
  searchMeta?: FuelListSearchMeta;
}

/**
 * The refuelings on the server-side table contract: order, filters and
 * pager answered by the API for the whole company. The page forwards the
 * URL's sort and filter params with `fuelListQuery`.
 */
const FuelTable = ({
  data,
  meta,
  responseError,
  searchMeta,
}: FuelTableProps): JSX.Element => {
  const columns = useMemo(buildFuelColumns, []);

  return (
    <DataTable
      data={data}
      meta={meta}
      columns={columns}
      responseError={responseError}
      server={FUEL_TABLE}
      toolbar={<FuelToolbar facets={searchMeta?.facets} />}
    />
  );
};

export { FuelTable };
