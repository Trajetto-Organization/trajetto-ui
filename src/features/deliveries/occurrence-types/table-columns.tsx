"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

import { DataTableColumnHeader } from "@/app/(protected)/_components/shared/tanstack-table/data-table-collumn-header";
import { displayValue, formatNotificationDate } from "@/lib/format-values";

import type { OccurrenceTypeData } from "@/actions/occurrence-type/list-occurrence-type";
import { OccurrenceTypeRowActions } from "./row-actions";

const buildOccurrenceTypeColumns = (): ColumnDef<OccurrenceTypeData>[] => [
  {
    id: "select",
    meta: {
      title: "Seleção",
    },
    header: ({ table }) => (
      <Checkbox
        id="select-all-occurrence-types"
        name="select-all-occurrence-types"
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        id={`select-occurrence-type-${row.id}`}
        name={`select-occurrence-type-${row.id}`}
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
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
      <p className="truncate font-medium w-72">
        {displayValue(row.getValue("id"))}
      </p>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    meta: { title: "Nome" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-56">
        {displayValue(row.getValue("name"))}
      </p>
    ),
  },
  {
    accessorKey: "description",
    meta: { title: "Descrição" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Descrição" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-72">
        {displayValue(row.getValue("description"))}
      </p>
    ),
    enableSorting: false,
  },
  {
    id: "blocks_delivery",
    accessorFn: (row) => (row.blocks_delivery ? "Sim" : "Não"),
    meta: { title: "Impeditiva" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Impeditiva" />
    ),
    cell: ({ row }) =>
      row.original.blocks_delivery ? (
        <Badge
          variant="outline"
          className="bg-red-100 text-red-800 border-red-200"
        >
          Sim
        </Badge>
      ) : (
        <Badge variant="outline">Não</Badge>
      ),
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    id: "requires_photo",
    accessorFn: (row) => (row.requires_photo ? "Obrigatória" : "Opcional"),
    meta: { title: "Foto" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Foto" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-28">
        {row.original.requires_photo ? "Obrigatória" : "Opcional"}
      </p>
    ),
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
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
    cell: ({ row }) => (
      <OccurrenceTypeRowActions row={row} />
    ),
  },
];

export { buildOccurrenceTypeColumns };
