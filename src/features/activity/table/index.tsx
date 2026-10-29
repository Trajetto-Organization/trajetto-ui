"use client";

import { useMemo } from "react";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";

import { ACTIVITY_TABLE } from "../lib/server-table";
import {
  buildActivityColumns,
  type ActivityScope,
  type ActivityTableRow,
} from "./columns";
import { ActivityToolbar } from "./toolbar";

interface ActivityTableProps {
  mode: ActivityScope;
  data: ActivityTableRow[];
  meta: { total: number; page: number; pageSize: number };
  responseError: { error: boolean; errorMessage: string };
}

/**
 * The activity table on the server-side contract: the filters and the order
 * of `created_at` answered by the API over the whole trail (decision 8.8).
 */
const ActivityTable = ({
  mode,
  data,
  meta,
  responseError,
}: ActivityTableProps): JSX.Element => {
  const columns = useMemo(() => buildActivityColumns(mode), [mode]);

  return (
    <DataTable
      data={data}
      meta={meta}
      columns={columns}
      responseError={responseError}
      server={ACTIVITY_TABLE}
      toolbar={<ActivityToolbar />}
    />
  );
};

export { ActivityTable };
