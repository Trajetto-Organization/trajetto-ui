"use client";

import { useMemo } from "react";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";

import type { FleetScope } from "@/features/service-order/lib/service-order-rules";

import { buildPartColumns } from "../table-columns";
import { PartToolbar } from "../toolbar";
import { PART_TABLE } from "../server-table";
import type { PartRow, PartSearchMeta } from "../lib/part-rules";

const PartTable = ({
  scope,
  data,
  meta,
  responseError,
  searchMeta,
}: {
  scope: FleetScope;
  data: PartRow[];
  meta: { total: number; page: number; pageSize: number };
  responseError: { error: boolean; errorMessage: string };
  searchMeta?: PartSearchMeta;
}): JSX.Element => {
  const columns = useMemo(() => buildPartColumns(scope), [scope]);

  return (
    <DataTable
      data={data}
      meta={meta}
      columns={columns}
      responseError={responseError}
      server={PART_TABLE}
      toolbar={<PartToolbar facets={searchMeta?.facets} />}
    />
  );
};

export { PartTable };
