"use client";

import { useMemo } from "react";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";

import {
  ACCOUNT_PAYABLE_TABLE,
  type AccountPayableRow,
  type AccountPayableSearchMeta,
} from "../lib/server-table";
import { buildAccountPayableColumns } from "./columns";
import { AccountPayableToolbar } from "./toolbar";

interface AccountPayableTableProps {
  data: AccountPayableRow[];
  meta: { total: number; page: number; pageSize: number };
  responseError: { error: boolean; errorMessage: string };
  searchMeta?: AccountPayableSearchMeta;
}

/**
 * The bills on the server-side table contract: order, filters and the pager
 * answered by the API for the whole company.
 */
const AccountPayableTable = ({
  data,
  meta,
  responseError,
  searchMeta,
}: AccountPayableTableProps): JSX.Element => {
  const columns = useMemo(buildAccountPayableColumns, []);

  return (
    <DataTable
      data={data}
      meta={meta}
      columns={columns}
      responseError={responseError}
      server={ACCOUNT_PAYABLE_TABLE}
      toolbar={<AccountPayableToolbar facets={searchMeta?.facets} />}
    />
  );
};

export { AccountPayableTable };
