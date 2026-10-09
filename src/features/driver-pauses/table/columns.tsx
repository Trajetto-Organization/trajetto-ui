"use client";

import { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/app/(protected)/_components/shared/tanstack-table/data-table-collumn-header";

import {
  PAUSE_FLAG_LABELS,
  clockOrDay,
  formatClock,
  formatDayAndClock,
  formatMinutes,
  formatWorkdayDay,
  pauseLine,
} from "../lib/pause-format";

import type { DriverDayRow } from "../types";

/**
 * One row per driver and workday. The column ids `driverName` and `flags`
 * are the server facets (server-table.ts); no column sorts, the report's
 * order is the API's. Hours are in the company's zone (`timeZone`).
 */
const buildPauseColumns = (timeZone: string): ColumnDef<DriverDayRow>[] => [
  {
    id: "day",
    accessorKey: "day",
    meta: { title: "Dia" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Dia" />
    ),
    cell: ({ row }) => (
      <div className="w-36 space-y-1">
        <p className="font-medium">{formatWorkdayDay(row.original.day)}</p>
        {row.original.inProgress && (
          <Badge
            variant="outline"
            className="border-sky-700 text-sky-800 dark:text-sky-300"
          >
            Em andamento
          </Badge>
        )}
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "driverName",
    accessorKey: "driverName",
    meta: { title: "Motorista" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Motorista" />
    ),
    cell: ({ row }) => (
      <p className="w-44 truncate" title={row.original.driverName}>
        {row.original.driverName || "—"}
      </p>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "workday",
    accessorFn: (row) => row.workday.minutes,
    meta: { title: "Jornada" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Jornada" />
    ),
    cell: ({ row }) => {
      const { workday, inProgress, restBeforeMinutes, previousWorkdayEnd } =
        row.original;

      return (
        <div className="w-48 space-y-1 text-sm">
          <p>
            {formatClock(workday.start, timeZone)}–
            {inProgress
              ? "agora"
              : clockOrDay(workday.start, workday.end, timeZone)}
            {" · "}
            {formatMinutes(workday.minutes)}
          </p>
          {restBeforeMinutes !== null && (
            <p
              className="text-xs text-muted-foreground"
              title={`Fim da jornada anterior: ${formatDayAndClock(previousWorkdayEnd, timeZone)}`}
            >
              Descanso antes: {formatMinutes(restBeforeMinutes)}
            </p>
          )}
        </div>
      );
    },
    enableSorting: false,
  },
  {
    id: "pauses",
    accessorFn: (row) => row.pauses.length,
    meta: { title: "Pausas" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Pausas" />
    ),
    cell: ({ row }) => {
      const { pauses } = row.original;

      if (pauses.length === 0) {
        return (
          <p className="w-64 text-sm text-muted-foreground">
            Nenhuma pausa registrada
          </p>
        );
      }

      return (
        <ul className="w-64 space-y-1 text-sm">
          {pauses.map((entry) => (
            <li key={entry.id}>
              <span>{pauseLine(entry, timeZone)}</span>
              {entry.note && (
                <span
                  className="block truncate text-xs text-muted-foreground"
                  title={entry.note}
                >
                  {entry.note}
                </span>
              )}
            </li>
          ))}
        </ul>
      );
    },
    enableSorting: false,
  },
  {
    id: "pauseTotal",
    accessorFn: (row) => row.totals.pauseMinutes,
    meta: { title: "Tempo em pausa" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tempo em pausa" />
    ),
    cell: ({ row }) => {
      const { totals } = row.original;

      return (
        <div className="w-40 space-y-1 text-sm">
          <p>{formatMinutes(totals.pauseMinutes)}</p>
          <p className="text-xs text-muted-foreground">
            Refeição: {formatMinutes(totals.mealMinutes)}
          </p>
        </div>
      );
    },
    enableSorting: false,
  },
  {
    id: "driving",
    accessorFn: (row) => row.totals.drivingMinutes,
    meta: { title: "Direção estimada" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Direção estimada" />
    ),
    cell: ({ row }) => {
      const { totals } = row.original;

      return (
        <div className="w-44 space-y-1 text-sm">
          <p>{formatMinutes(totals.drivingMinutes)}</p>
          <p className="text-xs text-muted-foreground">
            Maior trecho sem descanso:{" "}
            {formatMinutes(totals.longestDrivingWithoutRestMinutes)}
          </p>
        </div>
      );
    },
    enableSorting: false,
  },
  {
    id: "flags",
    accessorFn: (row) => row.flags.map((flag) => flag.code),
    meta: { title: "Alertas" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Alertas" />
    ),
    cell: ({ row }) => {
      const { flags } = row.original;

      if (flags.length === 0) {
        return (
          <p className="w-80 text-sm text-muted-foreground">Sem alertas</p>
        );
      }

      return (
        <ul className="w-80 space-y-2" aria-label="Alertas da jornada">
          {flags.map((flag) => (
            <li key={flag.code} className="space-y-1">
              <Badge
                variant="outline"
                className="border-amber-700 text-amber-800 dark:border-amber-400 dark:text-amber-300"
              >
                {PAUSE_FLAG_LABELS[flag.code] ?? flag.code}
              </Badge>
              <p className="text-xs text-muted-foreground">{flag.message}</p>
            </li>
          ))}
        </ul>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];

export { buildPauseColumns };
