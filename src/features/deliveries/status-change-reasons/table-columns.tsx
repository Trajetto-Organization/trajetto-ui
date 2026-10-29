"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";

import { DataTableColumnHeader } from "@/app/(protected)/_components/shared/tanstack-table/data-table-collumn-header";
import { idColumn } from "@/app/(protected)/_components/shared/tanstack-table/id-cell";
import { displayValue, formatNotificationDate } from "@/lib/format-values";

import type { StatusChangeReasonData } from "@/actions/status-change-reason/list-status-change-reason";
import { StatusChangeReasonRowActions } from "./row-actions";

const buildStatusChangeReasonColumns =
  (): ColumnDef<StatusChangeReasonData>[] => [
    idColumn<StatusChangeReasonData>(),
    {
      accessorKey: "name",
      meta: { title: "Nome" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nome" />
      ),
      cell: ({ row }) => (
        <p className="truncate font-medium w-64">
          {displayValue(row.getValue("name"))}
        </p>
      ),
      // The name is the reason's identifier, what the driver picks.
      enableHiding: false,
    },
    {
      accessorKey: "description",
      meta: { title: "Descrição" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Descrição" />
      ),
      cell: ({ row }) => (
        <p className="truncate font-medium w-80">
          {displayValue(row.getValue("description"))}
        </p>
      ),
      enableSorting: false,
    },
    {
      id: "is_active",
      accessorFn: (row) => (row.is_active ? "Ativo" : "Inativo"),
      meta: { title: "Status" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={
            row.original.is_active
              ? "bg-green-100 text-green-800 border-green-200"
              : "bg-gray-100 text-gray-500 border-gray-200"
          }
        >
          {row.original.is_active ? "Ativo" : "Inativo"}
        </Badge>
      ),
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: "created_at",
      meta: { title: "Criação" },
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
      meta: { title: "Atualização" },
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
      cell: ({ row }) => <StatusChangeReasonRowActions row={row} />,
    },
  ];

export { buildStatusChangeReasonColumns };
