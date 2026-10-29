"use client";

import { useMemo } from "react";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";
import type { ListQuery } from "@/lib/search-params";

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
  /** The screen's list query (content/list-section), shared with the cards. */
  listQuery?: ListQuery;
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
  listQuery,
}: BranchTableProps): JSX.Element => {
  const columns = useMemo(() => buildBranchColumns(mode), [mode]);

  return (
    <DataTable
      data={data}
      meta={meta}
      columns={columns}
      responseError={responseError}
      server={BRANCH_TABLE}
      listQuery={listQuery}
      toolbar={<BranchToolbar facets={searchMeta?.facets} />}
    />
  );
};

export { BranchTable };
