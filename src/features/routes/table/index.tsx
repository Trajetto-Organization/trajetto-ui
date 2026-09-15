"use client";

import { createElement } from "react";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";

import type { RouteListItem } from "@/actions/route/get-route";

import { buildRouteColumns } from "../table-columns";
import { RoutesTableToolbar } from "../table-toolbar";

interface RoutesTableProps {
  data: unknown[];
  meta: { total: number; page: number; pageSize: number };
  responseError: { error: boolean; errorMessage: string };
}

/**
 * The toolbar is handed over UNRENDERED: `DataTable` clones it with the table
 * instance, the error flag and the loading setter, which is how the filter
 * chips reach the columns without this component owning the table.
 */
const RoutesTable = ({
  data,
  meta,
  responseError,
}: RoutesTableProps): JSX.Element => {
  return (
    <DataTable
      data={data as RouteListItem[]}
      meta={meta}
      columns={buildRouteColumns()}
      responseError={responseError}
      toolbar={createElement(RoutesTableToolbar)}
    />
  );
};

export { RoutesTable };
