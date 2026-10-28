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

import type { DeliveryListItem } from "@/actions/delivery/get-delivery";
import { DELIVERY_STATUS_META } from "../lib/status";
import { DELIVERY_KIND_LABELS, deliveryKindOf } from "../lib/kind";

import { DeliveryRowActions } from "./row-actions";

/**
 * Kept as a factory for symmetry with the other tabs. What the viewer may do
 * is read inside the actions cell, straight from the session, so a permission
 * change does not have to travel through the column definitions.
 */
const buildDeliveryColumns = (): ColumnDef<DeliveryListItem>[] => [
  idColumn<DeliveryListItem>(),
  {
    // The client's order number, with the NF-e under it: what a dispatcher
    // reads off the paperwork. A delivery typed without either reads "N/A"
    // here; the record id is the column before.
    id: "code",
    accessorFn: (row) => row.code ?? row.invoice_number ?? "",
    meta: { title: "Código" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Código" />
    ),
    cell: ({ row }) => {
      const { code, invoice_number: invoice } = row.original;

      // The type, only when it is not the usual one (meeting of 14/10/2026):
      // a badge on every row saying "Entrega" would be noise on a list that
      // is almost all deliveries.
      const kind = deliveryKindOf(row.original);
      const kindBadge =
        kind === "DELIVERY" ? null : (
          <Badge
            variant="outline"
            data-delivery-kind={kind}
            className="mb-0.5 w-fit border-sky-300 bg-sky-50 px-1.5 py-0 text-[10px]
            text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200"
          >
            {DELIVERY_KIND_LABELS[kind]}
          </Badge>
        );

      if (!code && !invoice) {
        return (
          <div className="flex w-36 flex-col">
            {kindBadge}
            <p className="truncate font-medium">{displayValue(null)}</p>
          </div>
        );
      }

      return (
        <div className="flex w-36 flex-col">
          {kindBadge}
          <p className="truncate font-medium">{code ?? `NF-e: ${invoice}`}</p>
          {code && invoice && (
            <p className="truncate text-xs text-muted-foreground">
              NF-e: {invoice}
            </p>
          )}
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    // The Tipo filter's column (server facet `kind`). Hidden by default: the
    // badge in the first column already tells the exceptions apart, and the
    // table stays compact; "Visualizar" shows it for whoever wants it.
    id: "kind",
    accessorFn: (row) => DELIVERY_KIND_LABELS[deliveryKindOf(row)],
    meta: { title: "Tipo" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tipo" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-32">
        {DELIVERY_KIND_LABELS[deliveryKindOf(row.original)]}
      </p>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "recipient_name",
    meta: { title: "Destinatário" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Destinatário" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-56">
        {displayValue(row.getValue("recipient_name"))}
      </p>
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
