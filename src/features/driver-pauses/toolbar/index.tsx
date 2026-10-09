"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Table } from "@tanstack/react-table";
import { AlertTriangle, UserRound } from "lucide-react";

import { DatePickerField } from "@/app/(protected)/_components/shared/custom/date-picker-field";
import { DataTableServerFilters } from "@/app/(protected)/_components/shared/tanstack-table/data-table-server-filters";
import { DataTableViewOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table-view-options";
import { facetOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import { PAUSE_FLAG_LABELS } from "../lib/pause-format";
import { rangeIssue } from "../server-table";

import type { DriverDayRow, PauseReportSearchMeta } from "../types";

interface DriverPausesToolbarProps {
  facets?: PauseReportSearchMeta["facets"];

  /** The period the API answered (its default week when the URL has none). */
  period?: { from: string; to: string };

  /** Injected by DataTable via cloneElement — never passed by the caller. */
  table?: Table<DriverDayRow>;
  error?: boolean;
  isLoading?: boolean;
  setIsLoading?: (value: boolean) => void;
}

/**
 * The period and the filters. The period is two civil days in the URL
 * (`from`, `to`), checked here the way the API checks it, so a pick never
 * becomes a 400; a new period starts again on page 1. Driver and alert are
 * server facets with the API's counts (decision 8.8). The period stays
 * editable when the report failed: a period the API refused is fixed here.
 */
const DriverPausesToolbar = ({
  facets,
  period,
  table,
  error,
  setIsLoading,
}: DriverPausesToolbarProps): JSX.Element => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [, startTransition] = useTransition();

  const [from, setFrom] = useState<string>(period?.from ?? "");
  const [to, setTo] = useState<string>(period?.to ?? "");
  const [issue, setIssue] = useState<string | null>(null);

  // The API's answer wins after a navigation (a remount keeps the state).
  useEffect(() => {
    setFrom(period?.from ?? "");
    setTo(period?.to ?? "");
  }, [period?.from, period?.to]);

  const applyPeriod = (nextFrom: string, nextTo: string) => {
    setFrom(nextFrom);
    setTo(nextTo);

    const problem = rangeIssue(nextFrom || undefined, nextTo || undefined);

    setIssue(problem);

    if (problem || !nextFrom || !nextTo) return;

    const params = new URLSearchParams(searchParams.toString());

    params.set("from", nextFrom);
    params.set("to", nextTo);
    params.delete("page");

    setIsLoading?.(true);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <div
        className="grid w-full grid-cols-1 gap-3 sm:w-auto sm:grid-cols-[minmax(0,200px)_minmax(0,200px)]"
        data-tutorial="pauses-period"
      >
        <DatePickerField
          label="De"
          htmlfor="driver-pauses-from"
          name="pause_report_from"
          dateOnly
          value={from}
          onChange={(value) => applyPeriod(value, to)}
          errorName={issue ? [issue] : undefined}
        />
        <DatePickerField
          label="Até"
          htmlfor="driver-pauses-to"
          name="pause_report_to"
          dateOnly
          value={to}
          onChange={(value) => applyPeriod(from, value)}
        />
      </div>

      <div className="flex w-full flex-wrap items-center gap-2">
        <DataTableServerFilters
          table={table}
          dataTutorial="pauses-filters"
          filters={[
            {
              columnId: "driverName",
              title: "Motorista",
              icon: UserRound,
              options: facetOptions(facets?.driverId),
            },
            {
              columnId: "flags",
              title: "Alerta",
              icon: AlertTriangle,
              options: facetOptions(facets?.flag, PAUSE_FLAG_LABELS),
            },
          ]}
        />

        {!error && table && (
          <div className="w-full sm:ml-auto sm:w-auto">
            <DataTableViewOptions table={table} />
          </div>
        )}
      </div>
    </div>
  );
};

export { DriverPausesToolbar };
