"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MapPin, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/app/(protected)/_components/shared/tanstack-table/data-table-collumn-header";

import { formatNotificationDate, displayValue } from "@/lib/format-values";
import { DELIVERY_STATUS_META } from "../lib/status";

import type { OccurrenceRow } from "../lib/panels";
import { OccurrencePhotosCell } from "./photos-cell";
import { delayedOccurredAt } from "./received-at";

import { OccurrenceRowActions } from "./row-actions";
import { CATEGORY_LABELS, occurrenceCategory } from "./server-table";
import { authorizationBadge } from "../occurrence-authorizations/rules";

/**
 * The manager's cross-delivery occurrence feed, newest first.
 *
 * The ids of the sortable and filterable columns are the API's sort keys
 * (OCCURRENCE_TABLE in ./server-table): on the server-side table only those
 * sort, and the filters travel as URL params. The `filterFn`s only serve the
 * legacy client-side table the deliveries page falls back to when the API
 * sends no searchMeta.
 */
const buildOccurrenceColumns = (): ColumnDef<OccurrenceRow>[] => [
  {
    accessorKey: "id",
    meta: { title: "Identificador" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Identificador" />
    ),
    cell: ({ row }) => (
      <p className="w-80 truncate font-medium">
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
    // Decision 14.3: a proof recorded as a DELIVERED occurrence is a
    // delivery, not a problem; the reader tells them apart here.
    id: "category",
    accessorFn: (row) => CATEGORY_LABELS[occurrenceCategory(row)],
    meta: { title: "Categoria" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Categoria" />
    ),
    cell: ({ row }) =>
      occurrenceCategory(row.original) === "DELIVERED" ? (
        <Badge
          variant="outline"
          className="bg-green-100 text-green-800 border-green-200"
        >
          {CATEGORY_LABELS.DELIVERED}
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className="bg-amber-100 text-amber-900 border-amber-200"
        >
          {CATEGORY_LABELS.NOT_DELIVERED}
        </Badge>
      ),
    enableSorting: false,
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    id: "blocking",
    accessorFn: (row) =>
      occurrenceCategory(row) === "DELIVERED"
        ? "—"
        : row.occurrenceType.blocks_delivery
          ? "Impeditiva"
          : "Informativa",
    meta: { title: "Gravidade" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Gravidade" />
    ),
    cell: ({ row }) => {
      // Decision 6.3: a report waiting for (or denied by) the tower applied
      // nothing, whatever its severity says.
      const authorization = authorizationBadge(
        row.original.authorization_status,
      );

      return (
        <div className="flex w-40 flex-col items-start gap-1">
          {occurrenceCategory(row.original) === "DELIVERED" ? (
            // A delivery has no severity: "Informativa" would file it as a problem.
            <span
              className="text-sm text-muted-foreground"
              aria-label="Sem gravidade: entrega"
            >
              —
            </span>
          ) : row.original.occurrenceType.blocks_delivery ? (
            <Badge
              variant="outline"
              className="bg-red-100 text-red-800 border-red-200"
            >
              Impeditiva
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="bg-slate-100 text-slate-800 border-slate-200"
            >
              Informativa
            </Badge>
          )}
          {authorization && (
            <Badge
              variant="outline"
              className={authorization.className}
              title={row.original.authorization_note ?? undefined}
            >
              {authorization.label}
            </Badge>
          )}
        </div>
      );
    },
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
      <p
        className="w-52 truncate text-sm"
        title={row.original.description ?? ""}
      >
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
        receiptPhoto={row.original.receipt_photo}
        signature={row.original.signature}
        receivedBy={row.original.received_by}
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
    // Sorted by created_at on the server, so the column shows created_at: a
    // sortable column must render the value it is ordered by. A report that
    // waited on the phone (no signal) can be dated up to 7 days before it
    // arrived; showing that date here put rows out of order after
    // "Crescente"/"Decrescente". It stays as a second line, only when the
    // wait was material (see received-at).
    accessorKey: "created_at",
    meta: { title: "Recebida em" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Recebida em" />
    ),
    cell: ({ row }) => {
      const delayed = delayedOccurredAt(row.original);

      return (
        <div className="w-44" data-testid="occurrence-received-at">
          <p className="truncate font-medium">
            {formatNotificationDate(row.original.created_at, "pt-BR")}
          </p>
          {delayed && (
            <p
              className="truncate text-xs text-muted-foreground"
              title="Hora registrada no aparelho; a ocorrência chegou depois."
            >
              Ocorreu em {formatNotificationDate(delayed, "pt-BR")}
            </p>
          )}
        </div>
      );
    },
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
