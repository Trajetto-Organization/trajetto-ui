"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";

import { DataTableColumnHeader } from "@/app/(protected)/_components/shared/tanstack-table/data-table-collumn-header";
import { displayValue, formatNotificationDate } from "@/lib/format-values";

import type { ImportData } from "@/actions/import/list-imports";

import { ImportRowActions } from "./row-actions";
import { IMPORT_SOURCE_LABEL, IMPORT_STATUS_META } from "./lib/status";

/**
 * No selection checkbox: there is no bulk action on an upload, and offering a
 * column that selects rows nothing can act on is offering a dead end.
 */
const buildImportColumns = (): ColumnDef<ImportData>[] => [
  {
    accessorKey: "filename",
    meta: { title: "Arquivo" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Arquivo" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-64" title={row.original.filename}>
        {displayValue(row.getValue("filename"))}
      </p>
    ),
  },
  {
    id: "source",
    accessorFn: (row) => IMPORT_SOURCE_LABEL[row.source],
    meta: { title: "Origem" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Origem" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-28">
        {IMPORT_SOURCE_LABEL[row.original.source]}
      </p>
    ),
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
    enableSorting: false,
  },
  {
    id: "status",
    accessorFn: (row) => IMPORT_STATUS_META[row.status].label,
    meta: { title: "Status" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const meta = IMPORT_STATUS_META[row.original.status];

      return (
        <Badge variant="outline" className={meta.className}>
          {meta.label}
        </Badge>
      );
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "imported",
    meta: { title: "Importadas" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Importadas" />
    ),
    cell: ({ row }) => (
      <p className="w-24 truncate font-medium text-green-700 dark:text-green-500">
        {row.original.imported}
      </p>
    ),
  },
  {
    accessorKey: "duplicated",
    meta: { title: "Duplicadas" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Duplicadas" />
    ),
    cell: ({ row }) => (
      <p className="w-24 truncate font-medium">{row.original.duplicated}</p>
    ),
  },
  {
    accessorKey: "invalid",
    meta: { title: "Com erro" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Com erro" />
    ),
    cell: ({ row }) => (
      <p
        className={`w-24 truncate font-medium ${
          row.original.invalid > 0 ? "text-red-700 dark:text-red-500" : ""
        }`}
      >
        {row.original.invalid}
      </p>
    ),
  },
  {
    accessorKey: "created_at",
    meta: { title: "Enviada em" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Enviada em" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-40">
        {displayValue(
          formatNotificationDate(row.getValue("created_at"), "pt-BR"),
        )}
      </p>
    ),
  },
  {
    id: "reversed_at",
    accessorFn: (row) => row.reversed_at ?? "",
    meta: { title: "Estornada em" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Estornada em" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-40">
        {row.original.reversed_at
          ? formatNotificationDate(row.original.reversed_at, "pt-BR")
          : "—"}
      </p>
    ),
    enableSorting: false,
  },
  {
    id: "Ações",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ações" />
    ),
    cell: ({ row }) => <ImportRowActions row={row} />,
  },
];

export { buildImportColumns };
