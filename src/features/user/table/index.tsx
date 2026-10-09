"use client";

import { useMemo } from "react";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";

import type { AdminScope } from "../lib/scope";
import type { UserListSearchMeta } from "../lib/user-rules";
import { USER_TABLE } from "../server-table";
import type { UserListMeta, UserRow } from "../types";

import { buildUserColumns } from "./columns";
import { UserToolbar } from "./toolbar";

interface UsersTableProps {
  scope: AdminScope;
  data: UserRow[];
  meta: UserListMeta;
  responseError: { error: boolean; errorMessage: string };
  searchMeta?: UserListSearchMeta;
}

/**
 * The user list on the server-side table contract: order, filters and pager
 * all answered by the API for the whole company. The page forwards the URL's
 * sort and filter params with `userListQuery`.
 */
const UsersTable = ({
  scope,
  data,
  meta,
  responseError,
  searchMeta,
}: UsersTableProps): JSX.Element => {
  const columns = useMemo(() => buildUserColumns(scope), [scope]);

  return (
    <DataTable
      data={data}
      meta={meta}
      columns={columns}
      responseError={responseError}
      server={USER_TABLE}
      toolbar={<UserToolbar facets={searchMeta?.facets} />}
    />
  );
};

export { UsersTable };
