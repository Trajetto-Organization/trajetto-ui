"use client";

import { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/app/(protected)/_components/shared/tanstack-table/data-table-collumn-header";
import { idColumn } from "@/app/(protected)/_components/shared/tanstack-table/id-cell";

import {
  displayValue,
  formatDateOnly,
  formatNotificationDate,
} from "@/lib/format-values";

import type { RouteListItem } from "@/actions/route/get-route";

import { ROUTE_STATUS_META, routeProgress } from "./lib/status";
import { formatPlannedWindow } from "./lib/route-dates";
import { RouteRowActions } from "./row-actions";
import { RouteCodeLink } from "./route-code-link";

/**
 * The dispatcher's board.
 *
 * The column ids are the API's sort keys and facet columns (server-table.ts):
 * sorting and filtering happen on the server over the whole company
 * (decision 8.8), so no column filters or orders the loaded page. The cell
 * of a sortable column shows the value the server orders by.
 *
 * The shape follows every other table in the product: the record id first
 * (compact, like every table's), the audit dates last, the actions behind an
 * `Ações` header. The route's code, sequential per company, comes right
 * after: what a support call quotes ("a rota 42"). It is a small integer and
 * is shown whole, never through the id's abbreviation.
 */
const buildRouteColumns = (): ColumnDef<RouteListItem>[] => [
  idColumn<RouteListItem>(),
  {
    accessorKey: "code",
    meta: { title: "Código" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Código" />
    ),
    cell: ({ row }) => {
      const route = row.original;

      return (
        <div className="w-40">
          {/* The number is what everybody quotes on the phone; the name is
              optional and most dispatchers never type one. It opens the
              route's page (decision 14.7, D12). */}
          <RouteCodeLink routeId={route.id} code={route.code} />

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
        return (
          <p className="w-28 text-sm text-muted-foreground">Sem paradas</p>
        );
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
        <p className={`w-32 truncate ${plate ? "" : "text-muted-foreground"}`}>
          {/* A route without a vehicle cannot be released, so this is the
              column a dispatcher scans to find what is blocking the morning. */}
          {plate ?? "Sem veículo"}
        </p>
      );
    },
  },
  {
    accessorKey: "scheduled_date",
    meta: { title: "Data" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Data" />
    ),
    cell: ({ row }) => (
      <p className="w-28 truncate">
        {/* A civil day (decision 1.3), never an hour: in the browser's zone
            the route of the 17th read "16/09/2026 às 21:00". */}
        {formatDateOnly(row.getValue("scheduled_date"), { fallback: "—" })}
      </p>
    ),
  },
  {
    accessorKey: "destination",
    meta: { title: "Destino" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Destino" />
    ),
    cell: ({ row }) => {
      const destination = row.original.destination;

      return (
        <p
          className={`w-40 truncate ${destination ? "" : "text-muted-foreground"}`}
          title={destination ?? undefined}
        >
          {destination ?? "—"}
        </p>
      );
    },
  },
  {
    id: "plannedWindow",
    meta: { title: "Previsto" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Previsto" />
    ),
    cell: ({ row }) => {
      // Saída e retorno previstos, on the browser's clock (decision 1.4):
      // what the tower's punctuality compares the real departure with.
      const planned = formatPlannedWindow(
        row.original.planned_departure_at,
        row.original.planned_arrival_at,
      );

      return (
        <p
          className={`w-36 truncate text-sm ${planned ? "" : "text-muted-foreground"}`}
        >
          {planned ?? "Sem horário"}
        </p>
      );
    },
    enableSorting: false,
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
    accessorKey: "completed_at",
    meta: { title: "Conclusão" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Conclusão" />
    ),
    cell: ({ row }) => (
      <p className="w-36 truncate text-sm text-muted-foreground">
        {/* Saída and Conclusão are the two ends of the driver's day, and the
            difference between them is the question every audit asks first. */}
        {displayValue(
          formatNotificationDate(row.getValue("completed_at"), "pt-BR"),
        )}
      </p>
    ),
  },
  {
    accessorKey: "created_at",
    meta: { title: "Criação" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Data de criação" />
    ),
    cell: ({ row }) => (
      <p className="w-36 truncate font-medium">
        {displayValue(
          formatNotificationDate(row.getValue("created_at"), "pt-BR"),
        )}
      </p>
    ),
  },
  {
    accessorKey: "updated_at",
    meta: { title: "Atualização" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Data de atualização" />
    ),
    cell: ({ row }) => (
      <p className="w-36 truncate font-medium">
        {displayValue(
          formatNotificationDate(row.getValue("updated_at"), "pt-BR"),
        )}
      </p>
    ),
  },
  {
    id: "Ações",
    meta: { title: "Ações" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ações" />
    ),
    cell: ({ row }) => <RouteRowActions route={row.original} />,
    enableSorting: false,
    enableHiding: false,
  },
];

export { buildRouteColumns };
