"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MapPin, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/app/(protected)/_components/shared/tanstack-table/data-table-collumn-header";

import { formatNotificationDate, displayValue } from "@/lib/format-values";
import { DELIVERY_STATUS_META } from "../lib/status";

import type { OccurrenceRow } from "../lib/panels";
import { OccurrencePhotosCell } from "./photos-cell";

import { OccurrenceRowActions } from "./row-actions";

/** The manager's cross-delivery occurrence feed, newest first. */
const buildOccurrenceColumns = (): ColumnDef<OccurrenceRow>[] => [
  {
    accessorKey: "id",
    meta: { title: "Identificador" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Identificador" />
    ),
    cell: ({ row }) => (
      <p className="w-72 truncate font-medium">
        {displayValue(row.getValue("id"))}
      </p>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "typeName",
    accessorFn: (row) => row.occurrenceType.name,
    meta: { title: "Tipo" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tipo" />
    ),
    cell: ({ row }) => (
      <div className="flex w-44 items-center gap-1.5">
        {row.original.occurrenceType.blocks_delivery && (
          <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-red-600" />
        )}
        <p className="truncate font-medium">
          {row.original.occurrenceType.name}
        </p>
      </div>
    ),
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    id: "blocking",
    accessorFn: (row) =>
      row.occurrenceType.blocks_delivery ? "Impeditiva" : "Informativa",
    meta: { title: "Impeditiva" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Gravidade" />
    ),
    cell: ({ row }) =>
      row.original.occurrenceType.blocks_delivery ? (
        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
          Impeditiva
        </Badge>
      ) : (
        <Badge variant="outline" className="bg-slate-100 text-slate-800 border-slate-200">
          Informativa
        </Badge>
      ),
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    id: "recipient",
    accessorFn: (row) => row.delivery.recipient_name,
    meta: { title: "Entrega" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Entrega" />
    ),
    cell: ({ row }) => (
      <div className="w-48">
        <p className="truncate font-medium">
          {row.original.delivery.recipient_name}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {row.original.delivery.code
            ? `Pedido: ${row.original.delivery.code}`
            : `${row.original.delivery.city}/${row.original.delivery.uf}`}
        </p>
      </div>
    ),
  },
  {
    id: "deliveryStatus",
    accessorFn: (row) => DELIVERY_STATUS_META[row.delivery.status].label,
    meta: { title: "Status da entrega" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status da entrega" />
    ),
    cell: ({ row }) => {
      const meta = DELIVERY_STATUS_META[row.original.delivery.status];

      return (
        <Badge variant="outline" className={meta.badgeClassName}>
          {meta.label}
        </Badge>
      );
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "description",
    meta: { title: "Relato" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Relato" />
    ),
    cell: ({ row }) => (
      <p className="w-52 truncate text-sm" title={row.original.description ?? ""}>
        {displayValue(row.original.description)}
      </p>
    ),
    enableSorting: false,
  },
  {
    id: "photos",
    meta: { title: "Fotos" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Fotos" />
    ),
    cell: ({ row }) => (
      <OccurrencePhotosCell
        photos={row.original.photos}
        occurrenceTypeName={row.original.occurrenceType.name}
      />
    ),
    enableSorting: false,
  },
  {
    id: "reporter",
    accessorFn: (row) => row.reportedBy.name,
    meta: { title: "Registrada por" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Registrada por" />
    ),
    cell: ({ row }) => (
      <p className="w-40 truncate font-medium">
        {row.original.reportedBy.name}
      </p>
    ),
  },
  {
    id: "location",
    meta: { title: "Local" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Local" />
    ),
    cell: ({ row }) =>
      row.original.latitude !== null ? (
        <a
          href={`https://www.google.com/maps?q=${row.original.latitude},${row.original.longitude}`}
          target="_blank"
          rel="noreferrer"
          className="flex w-24 items-center gap-0.5 text-xs underline
          underline-offset-2"
        >
          <MapPin className="h-3 w-3" />
          Ver no mapa
        </a>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
    enableSorting: false,
  },
  {
    accessorKey: "created_at",
    meta: { title: "Data" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Data" />
    ),
    cell: ({ row }) => (
      <p className="w-36 truncate font-medium">
        {formatNotificationDate(row.original.created_at, "pt-BR")}
      </p>
    ),
  },
  {
    id: "Ações",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ações" />
    ),
    cell: ({ row }) => <OccurrenceRowActions row={row} />,
  },
];

export { buildOccurrenceColumns };
