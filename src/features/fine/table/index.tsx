"use client";

import { useMemo } from "react";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";

import { FINE_TABLE } from "../lib/server-table";
import type { FineListSearchMeta, FineRow } from "../lib/types";

import { buildFineColumns } from "../table-columns";
import { FineToolbar } from "../toolbar";

interface FineTableProps {
  data: FineRow[];
  meta: { total: number; page: number; pageSize: number };
  responseError: { error: boolean; errorMessage: string };
  /** The NDJSON meta line's `searchMeta`: the filter options and counts. */
  searchMeta?: FineListSearchMeta;
}

/**
 * The fines table on the server-side table contract: order, filters and
 * pager answered by the API for the whole company (decision 8.8). The page
 * forwards the URL's sort and filter params with `fineListQuery`.
 */
const FineTable = ({
  data,
  meta,
  responseError,
  searchMeta,
}: FineTableProps): JSX.Element => {
  const columns = useMemo(buildFineColumns, []);

  return (
    <DataTable
      data={data}
      meta={meta}
      columns={columns}
      responseError={responseError}
      server={FINE_TABLE}
      toolbar={<FineToolbar facets={searchMeta?.facets} />}
    />
  );
};

export { FineTable };
