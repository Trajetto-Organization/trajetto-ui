"use client";

import { useMemo } from "react";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";

import type { RouteListItem } from "@/actions/route/get-route";

import { buildRouteColumns } from "../table-columns";
import { RoutesTableToolbar } from "../table-toolbar";
import { ROUTE_TABLE, type RouteListSearchMeta } from "../server-table";

interface RoutesTableProps {
  data: unknown[];
  meta: { total: number; page: number; pageSize: number };
  responseError: { error: boolean; errorMessage: string };
  /** The NDJSON meta line's `searchMeta`: cards and filter options. */
  searchMeta?: RouteListSearchMeta;
}

/**
 * The routes board on the server-side table contract: order, filters and
 * pager answered by the API for the whole company. The page forwards the
 * URL's sort and filter params with `routesListQuery`.
 *
 * The toolbar is handed over UNRENDERED: `DataTable` clones it with the
 * table instance, the error flag and the loading setter.
 */
const RoutesTable = ({
  data,
  meta,
  responseError,
  searchMeta,
}: RoutesTableProps): JSX.Element => {
  const columns = useMemo(buildRouteColumns, []);

  return (
    <DataTable
      data={data as RouteListItem[]}
      meta={meta}
      columns={columns}
      responseError={responseError}
      server={ROUTE_TABLE}
      toolbar={<RoutesTableToolbar facets={searchMeta?.facets} />}
    />
  );
};

export { RoutesTable };
