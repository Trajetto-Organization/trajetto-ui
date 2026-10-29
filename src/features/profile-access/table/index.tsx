"use client";

import { useMemo } from "react";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";

import type { AdminScope } from "@/features/user/lib/scope";

import { PROFILE_ACCESS_TABLE } from "../server-table";
import type { ProfileAccessListMeta, ProfileAccessRow } from "../types";

import { buildProfileAccessColumns } from "./columns";
import { ProfileAccessToolbar } from "./toolbar";

interface ProfileAccessTableProps {
  scope: AdminScope;
  data: ProfileAccessRow[];
  meta: ProfileAccessListMeta;
  responseError: { error: boolean; errorMessage: string };
}

/**
 * The access-profile list on the server-side table contract: order, search
 * and pager answered by the API for the whole company (decision 8.8).
 */
const ProfileAccessTable = ({
  scope,
  data,
  meta,
  responseError,
}: ProfileAccessTableProps): JSX.Element => {
  const columns = useMemo(() => buildProfileAccessColumns(scope), [scope]);

  return (
    <DataTable
      data={data}
      meta={meta}
      columns={columns}
      responseError={responseError}
      server={PROFILE_ACCESS_TABLE}
      toolbar={<ProfileAccessToolbar />}
    />
  );
};

export { ProfileAccessTable };
