"use client";

import { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/app/(protected)/_components/shared/tanstack-table/data-table-collumn-header";

import { displayValue, formatNotificationDate } from "@/lib/format-values";

import type { RouteListItem } from "@/actions/route/get-route";

import { ROUTE_STATUS_META, routeProgress } from "./lib/status";
import { RouteRowActions } from "./row-actions";

/**
 * The dispatcher's board.
 *
 * Every filterable column returns the LABEL rather than the raw enum, so the
 * faceted filter chips read in Portuguese — the same reason the delivery table
 * does it.
 */
const buildRouteColumns = (): ColumnDef<RouteListItem>[] => [
  {
    accessorKey: "code",
    meta: { title: "Rota" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Rota" />,
    cell: ({ row }) => {
      const route = row.original;

      return (
        <div className="w-40">
          {/* The number is what everybody quotes on the phone; the name is
              optional and most dispatchers never type one. */}
          <p className="truncate font-medium">Rota {route.code}</p>

          {route.name && (
            <p className="truncate text-xs text-muted-foreground">
              {route.name}
            </p>
          )}
        </div>
      );
    },
    enableHiding: false,
  },
  {
    id: "status",
    accessorFn: (row) => ROUTE_STATUS_META[row.status].label,
    meta: { title: "Status" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const meta = ROUTE_STATUS_META[row.original.status];

      return (
        <Badge variant="outline" className={meta.badgeClassName}>
          {meta.label}
        </Badge>
      );
    },
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
  {
    id: "progress",
    meta: { title: "Paradas" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Paradas" />
    ),
    cell: ({ row }) => {
      const { done, total } = routeProgress(
        row.original.stops.map((stop) => stop.status),
      );

      if (total === 0) {
        // A route with no stops is a draft the dispatcher has not filled in,
        // and saying "0/0" reads like a bug.
        return <p className="w-28 text-sm text-muted-foreground">Sem paradas</p>;
      }

      return (
        <p className="w-28 text-sm">
          <span className="font-medium">{done}</span>
          <span className="text-muted-foreground">/{total}</span>
          <span className="ml-1 text-xs text-muted-foreground">resolvidas</span>
        </p>
      );
    },
    enableSorting: false,
  },
  {
    id: "driverName",
    accessorFn: (row) => row.driver?.name ?? "Sem motorista",
    meta: { title: "Motorista" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Motorista" />
    ),
    cell: ({ row }) => (
      <p className="w-44 truncate">{row.getValue("driverName")}</p>
    ),
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
  {
    id: "vehiclePlate",
    accessorFn: (row) => row.vehicle?.license_plate ?? "Sem veículo",
    meta: { title: "Veículo" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Veículo" />
    ),
    cell: ({ row }) => {
      const plate = row.original.vehicle?.license_plate;

      return (
        <p
          className={`w-32 truncate ${plate ? "" : "text-muted-foreground"}`}
        >
          {/* A route without a vehicle cannot be released, so this is the
              column a dispatcher scans to find what is blocking the morning. */}
          {plate ?? "Sem veículo"}
        </p>
      );
    },
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "scheduled_date",
    meta: { title: "Data" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Data" />
    ),
    cell: ({ row }) => (
      <p className="w-32 truncate">
        {displayValue(
          formatNotificationDate(row.getValue("scheduled_date"), "pt-BR"),
        )}
      </p>
    ),
  },
  {
    accessorKey: "started_at",
    meta: { title: "Saída" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Saída" />
    ),
    cell: ({ row }) => (
      <p className="w-36 truncate text-sm text-muted-foreground">
        {displayValue(
          formatNotificationDate(row.getValue("started_at"), "pt-BR"),
        )}
      </p>
    ),
  },
  {
    id: "actions",
    meta: { title: "Ações" },
    cell: ({ row }) => <RouteRowActions route={row.original} />,
    enableSorting: false,
    enableHiding: false,
  },
];

export { buildRouteColumns };
