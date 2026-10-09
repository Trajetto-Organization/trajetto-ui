"use client";

import { useMemo } from "react";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";

import type { UserListSearchMeta } from "../lib/user-rules";
import { MASTER_USER_TABLE } from "../server-table";
import type { UserListMeta, UserRow } from "../types";

import { buildMasterColumns } from "./columns";
import { UserToolbar } from "./toolbar";

interface MasterUsersTableProps {
  data: UserRow[];
  meta: UserListMeta;
  responseError: { error: boolean; errorMessage: string };
  searchMeta?: UserListSearchMeta;
}

/**
 * The platform's masters on the server-side table contract: order, the
 * access and 2FA filters and the pager answered by the API (decision 8.8).
 */
const MasterUsersTable = ({
  data,
  meta,
  responseError,
  searchMeta,
}: MasterUsersTableProps): JSX.Element => {
  const columns = useMemo(() => buildMasterColumns(), []);

  return (
    <DataTable
      data={data}
      meta={meta}
      columns={columns}
      responseError={responseError}
      server={MASTER_USER_TABLE}
      toolbar={<UserToolbar variant="masters" facets={searchMeta?.facets} />}
    />
  );
};

export { MasterUsersTable };
