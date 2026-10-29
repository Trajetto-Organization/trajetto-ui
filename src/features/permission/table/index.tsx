"use client";

import { useMemo } from "react";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";

import type { AdminScope } from "@/features/user/lib/scope";

import type { PermissionListSearchMeta } from "../lib/permission-rules";
import { PERMISSION_TABLE } from "../server-table";
import type { PermissionListMeta, PermissionRow } from "../types";

import { buildPermissionColumns } from "./columns";
import { PermissionToolbar } from "./toolbar";

interface PermissionsTableProps {
  scope: AdminScope;
  data: PermissionRow[];
  meta: PermissionListMeta;
  responseError: { error: boolean; errorMessage: string };
  searchMeta?: PermissionListSearchMeta;
}

/**
 * The permission list on the server-side table contract: order, filters and
 * pager answered by the API for the whole company (decision 8.8). The page
 * forwards the URL's sort and filter params with `permissionListQuery`.
 */
const PermissionsTable = ({
  scope,
  data,
  meta,
  responseError,
  searchMeta,
}: PermissionsTableProps): JSX.Element => {
  const columns = useMemo(() => buildPermissionColumns(scope), [scope]);

  return (
    <DataTable
      data={data}
      meta={meta}
      columns={columns}
      responseError={responseError}
      server={PERMISSION_TABLE}
      toolbar={<PermissionToolbar facets={searchMeta?.facets} />}
    />
  );
};

export { PermissionsTable };
