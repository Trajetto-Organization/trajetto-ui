"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";

import { DataTableColumnHeader } from "@/app/(protected)/_components/shared/tanstack-table/data-table-collumn-header";
import { idColumn } from "@/app/(protected)/_components/shared/tanstack-table/id-cell";
import {
  formatCnpj,
  formatTelephone,
  formatNotificationDate,
  displayValue,
} from "@/lib/format-values";

import type { ShipperData } from "@/actions/shipper/list-shipper";
import { ShipperRowActions } from "./row-actions";

const buildShipperColumns = (): ColumnDef<ShipperData>[] => [
  idColumn<ShipperData>(),
  {
    // The shipper's CNPJ is how the operation and the NF-e name it. Some
    // shippers are registered without one: the name then identifies the row.
    accessorKey: "cnpj",
    meta: { title: "CNPJ" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="CNPJ" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-40">
        {row.original.cnpj ? formatCnpj(row.original.cnpj) : row.original.name}
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
      <p className="truncate font-medium w-64">
        {displayValue(row.getValue("name"))}
      </p>
    ),
  },
  {
    accessorKey: "email",
    meta: { title: "E-mail" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="E-mail" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-48">
        {displayValue(row.getValue("email"))}
      </p>
    ),
  },
  {
    accessorKey: "telephone",
    meta: { title: "Telefone" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Telefone" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-36">
        {row.original.telephone
          ? formatTelephone(row.original.telephone)
          : displayValue(null)}
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
    cell: ({ row }) => <ShipperRowActions row={row} />,
  },
];

export { buildShipperColumns };
