"use client";

import { useMemo } from "react";

import { DataTable } from "@/app/(protected)/_components/shared/tanstack-table/data-table";

import { buildPauseColumns } from "./columns";
import { DriverPausesToolbar } from "../toolbar";
import { PAUSE_TABLE } from "../server-table";

import type { DriverDayRow, PauseReportSearchMeta } from "../types";

interface DriverPausesTableProps {
  data: DriverDayRow[];
  meta: { total: number; page: number; pageSize: number };
  responseError: { error: boolean; errorMessage: string };
  searchMeta?: PauseReportSearchMeta;

  /** The company's zone, from the report; the browser's until it answers. */
  timeZone?: string;
  period?: { from: string; to: string };

  /** `null` when the page shows its own empty state above the table. */
  emptyMessage?: React.ReactNode;
}

/**
 * The report on the server-side table contract: filters, counts and pager
 * answered by the API for the whole period. Rows are keyed by their `id`
 * (`<driverId>:<day>`), stable across pages.
 *
 * The toolbar is handed over UNRENDERED: `DataTable` clones it with the
 * table instance, the error flag and the loading setter.
 */
const DriverPausesTable = ({
  data,
  meta,
  responseError,
  searchMeta,
  timeZone,
  period,
  emptyMessage,
}: DriverPausesTableProps): JSX.Element => {
  const zone = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const columns = useMemo(() => buildPauseColumns(zone), [zone]);

  return (
    <div data-tutorial="pauses-table">
      <DataTable
        data={data}
        meta={meta}
        columns={columns}
        responseError={responseError}
        server={PAUSE_TABLE}
        emptyMessage={emptyMessage}
        toolbar={
          <DriverPausesToolbar
            facets={searchMeta?.facets}
            period={period}
            timeZone={timeZone}
          />
        }
      />
    </div>
  );
};

export { DriverPausesTable };
