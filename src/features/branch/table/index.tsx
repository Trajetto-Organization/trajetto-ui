"use client";

import { useMemo } from "react";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";

import type { BranchScope } from "../lib/scope";
import {
  BRANCH_TABLE,
  type BranchRow,
  type BranchSearchMeta,
} from "../lib/server-table";
import { buildBranchColumns } from "./columns";
import { BranchToolbar } from "./toolbar";

interface BranchTableProps {
  mode: BranchScope;
  data: BranchRow[];
  meta: { total: number; page: number; pageSize: number };
  responseError: { error: boolean; errorMessage: string };
  searchMeta?: BranchSearchMeta;
}

/**
 * Branches on the server-side table contract: order, the status and UF
 * filters and the pager answered by the API for the whole company.
 */
const BranchTable = ({
  mode,
  data,
  meta,
  responseError,
  searchMeta,
}: BranchTableProps): JSX.Element => {
  const columns = useMemo(() => buildBranchColumns(mode), [mode]);

  return (
    <DataTable
      data={data}
      meta={meta}
      columns={columns}
      responseError={responseError}
      server={BRANCH_TABLE}
      toolbar={<BranchToolbar facets={searchMeta?.facets} />}
    />
  );
};

export { BranchTable };
