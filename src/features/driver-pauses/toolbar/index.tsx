"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Table } from "@tanstack/react-table";
import { AlertTriangle, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";

import { dayKeyIn, formatDateKeyRange } from "@/lib/date-key";

import { PeriodSwitch } from "@/app/(protected)/_components/shared/period-switch";
import { DateRangePicker } from "@/app/(protected)/_components/shared/custom/date-range-picker";
import { DataTableServerFilters } from "@/app/(protected)/_components/shared/tanstack-table/data-table-server-filters";
import { DataTableToolbarEnd } from "@/app/(protected)/_components/shared/tanstack-table/data-table-toolbar-end";
import { facetOptions } from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import { PAUSE_FLAG_LABELS } from "../lib/pause-format";
import {
  PAUSE_REPORT_MAX_DAYS,
  PAUSE_REPORT_YEARS,
  rangeIssue,
  readDayParam,
} from "../server-table";

import type { DriverDayRow, PauseReportSearchMeta } from "../types";

interface DriverPausesToolbarProps {
  facets?: PauseReportSearchMeta["facets"];

  /** The period the API answered (its default week when the URL has none). */
  period?: { from: string; to: string };

  /**
   * The company's zone, from the report: its today is the last day that can
   * be picked. The browser's until the report answers.
   */
  timeZone?: string;

  /** Injected by DataTable via cloneElement — never passed by the caller. */
  table?: Table<DriverDayRow>;
  error?: boolean;
  isLoading?: boolean;
  setIsLoading?: (value: boolean) => void;
}

/**
 * The filters, then the period beside Visualizar — the same toolbar as
 * Entregas (DataTableToolbarEnd, the shared range picker).
 *
 * The period is two civil days in the URL (`from`, `to`), checked in the
 * popover the way the API checks them (31 days at most, both included), so
 * a pick never becomes a 400; Aplicar sends both days at once and starts
 * again on page 1. It used to be two single-day fields with a label each on
 * a line of their own, and every pick of either reloaded the report. The
 * days after the company's today cannot be picked. Driver and alert are
 * server facets with the API's counts (decision 8.8). The period stays
 * usable when the report failed: a period the API refused is fixed here.
 */
const DriverPausesToolbar = ({
  facets,
  period,
  timeZone,
  table,
  error,
  setIsLoading,
}: DriverPausesToolbarProps): JSX.Element => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [, startTransition] = useTransition();

  // The API's answer; the URL's days while there is none (a failed read).
  const from = period?.from ?? readDayParam(searchParams.get("from"));
  const to = period?.to ?? readDayParam(searchParams.get("to"));

  const applyPeriod = (next: { from: string; to: string }) => {
    const params = new URLSearchParams(searchParams.toString());

    params.set("from", next.from);
    params.set("to", next.to);
    params.delete("page");

    setIsLoading?.(true);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  return (
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

      <DataTableToolbarEnd table={table} error={error}>
        <PeriodSwitch label="Período das pausas" dataTutorial="pauses-period">
          <DateRangePicker
            label="Período das pausas"
            title="Período"
            initialRange={{ from, to }}
            minDate={`${PAUSE_REPORT_YEARS.first}-01-01`}
            maxDate={dayKeyIn(new Date(), timeZone)}
            validate={rangeIssue}
            hint={`Até ${PAUSE_REPORT_MAX_DAYS} dias, nos dias da empresa.`}
            onApply={applyPeriod}
          >
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 font-medium tabular-nums"
              data-pauses-period-trigger
            >
              {from && to ? formatDateKeyRange(from, to) : "Escolher período"}
            </Button>
          </DateRangePicker>
        </PeriodSwitch>
      </DataTableToolbarEnd>
    </div>
  );
};

export { DriverPausesToolbar };
