"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

import { DataTableColumnHeader } from "@/app/(protected)/_components/shared/tanstack-table/data-table-collumn-header";
import {
  displayValue,
  formatDateOnly,
  formatNotificationDate,
} from "@/lib/format-values";

import type { DeliveryListItem } from "@/actions/delivery/get-delivery";
import { DELIVERY_STATUS_META } from "../lib/status";

import { DeliveryRowActions } from "./row-actions";

/**
 * Kept as a factory for symmetry with the other tabs. What the viewer may do
 * is read inside the actions cell, straight from the session, so a permission
 * change does not have to travel through the column definitions.
 */
const buildDeliveryColumns = (): ColumnDef<DeliveryListItem>[] => [
  {
    id: "select",
    meta: {
      title: "Seleção",
    },
    header: ({ table }) => (
      <Checkbox
        id="select-all-deliveries"
        name="select-all-deliveries"
        data-tutorial="deliveries-select-all"
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Selecionar todas"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        id={`select-delivery-${row.id}`}
        name={`select-delivery-${row.id}`}
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Selecionar linha"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "id",
    meta: {
      title: "Identificador",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Identificador" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-80">
        {displayValue(row.getValue("id"))}
      </p>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "recipient_name",
    meta: { title: "Destinatário" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Destinatário" />
    ),
    cell: ({ row }) => (
      <div className="w-56">
        <p className="truncate font-medium">
          {displayValue(row.getValue("recipient_name"))}
        </p>
        {row.original.code && (
          <p className="truncate text-xs text-muted-foreground">
            Pedido: {row.original.code}
          </p>
        )}
      </div>
    ),
  },
  {
    id: "status",
    accessorFn: (row) => DELIVERY_STATUS_META[row.status].label,
    meta: { title: "Status" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const meta = DELIVERY_STATUS_META[row.original.status];

      // Derived state, not a status: PENDING with a driver reads as
      // "Designada". Moving to IN_TRANSIT still belongs to the driver
      // starting the route in the app.
      const isAssigned =
        row.original.status === "PENDING" && row.original.driver != null;

      return (
        <div className="flex w-36 flex-wrap items-center gap-1">
          <Badge variant="outline" className={meta.badgeClassName}>
            {meta.label}
          </Badge>
          {isAssigned && (
            <Badge
              variant="outline"
              className="bg-violet-100 text-violet-800 border-violet-200"
            >
              Designada
            </Badge>
          )}
        </div>
      );
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    id: "shipperName",
    accessorFn: (row) => row.shipper?.name ?? "Sem embarcador",
    meta: { title: "Embarcador" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Embarcador" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-44">
        {displayValue(row.original.shipper?.name)}
      </p>
    ),
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    id: "destination",
    accessorFn: (row) => `${row.city}/${row.uf}`,
    meta: { title: "Destino" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Destino" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-36">
        {row.original.city}/{row.original.uf}
      </p>
    ),
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "invoice_number",
    meta: { title: "NF-e" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="NF-e" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-24">
        {displayValue(row.getValue("invoice_number"))}
      </p>
    ),
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
      <div className="w-40">
        <p className="truncate font-medium">
          {displayValue(row.original.driver?.name)}
        </p>
        {/* Homonymous drivers are told apart by CNH. */}
        {row.original.driver?.cnh && (
          <p className="truncate text-xs text-muted-foreground">
            CNH: {row.original.driver.cnh}
          </p>
        )}
      </div>
    ),
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "scheduled_date",
    meta: { title: "Prevista" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Data prevista" />
    ),
    // A day, not an instant (decisions 1.3 and 1.5): no "às 00:00", and read
    // as the day stored, never shifted by the browser zone.
    cell: ({ row }) => (
      <p className="truncate font-medium w-32">
        {formatDateOnly(row.original.scheduled_date, {
          fallback: displayValue(null) ?? undefined,
        })}
      </p>
    ),
  },
  {
    accessorKey: "delivered_at",
    meta: { title: "Entregue em" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Entregue em" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-36">
        {row.original.delivered_at
          ? formatNotificationDate(row.original.delivered_at, "pt-BR")
          : displayValue(null)}
      </p>
    ),
  },
  {
    accessorKey: "created_at",
    meta: {
      title: "Criação",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Data de criação" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-36">
        {displayValue(
          formatNotificationDate(row.getValue("created_at"), "pt-BR"),
        )}
      </p>
    ),
  },
  {
    accessorKey: "updated_at",
    meta: {
      title: "Atualização",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Data de atualização" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-36">
        {displayValue(
          formatNotificationDate(row.getValue("updated_at"), "pt-BR"),
        )}
      </p>
    ),
  },
  {
    id: "Ações",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ações" />
    ),
    cell: ({ row }) => <DeliveryRowActions row={row} />,
  },
];

export { buildDeliveryColumns };
