"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";

import { partTableSchema } from "@/schemas/part-table-schema";
import { DataTableColumnHeader } from "../../../tanstack-table/data-table-collumn-header";

import {
  displayValue,
  formatNotificationDate,
  formatToBrazilianCurrency,
} from "@/lib/format-values";
import { DataTablePartRowActions } from "../data-table-row-actions";

const tablePartCollumns: ColumnDef<partTableSchema>[] = [
  {
    id: "select",
    meta: {
      title: "Seleção",
    },
    header: ({ table }) => (
      <Checkbox
        id="select-all-parts"
        name="select-all-parts"
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
        id={`select-part-${row.id}`}
        name={`select-part-${row.id}`}
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
    accessorKey: "description",
    meta: {
      title: "Descrição da Peça",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Descrição da peça" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-44">
          {displayValue(row.getValue("description"))}
        </p>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "unit_price",
    meta: {
      title: "Preço unitário",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Preço unitário" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-32">
          {displayValue(formatToBrazilianCurrency(row.getValue("unit_price")))}
        </p>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "businessId",
    meta: {
      title: "Identificador da empresa",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Identificador da empresa" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-48">
          {displayValue(row.getValue("businessId"))}
        </p>
      );
    },
  },
  {
    accessorKey: "businessName",
    accessorFn: (row) => row.business?.corporate_reason,
    meta: {
      title: "Nome da empresa",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome da empresa" />
    ),
    cell: ({ row }) => {
      const businessName = row.original.business?.corporate_reason;
      return (
        <p className="truncate font-medium w-48">
          {displayValue(businessName)}
        </p>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "supplierId",
    meta: {
      title: "Identificador do fornecedor",
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Identificador do fornecedor"
      />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-48">
          {displayValue(row.getValue("supplierId"))}
        </p>
      );
    },
  },
  {
    accessorKey: "supplierName",
    accessorFn: (row) => row.supplier?.name,
    meta: {
      title: "Nome do fornecedor",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome do fornecedor" />
    ),
    cell: ({ row }) => {
      const supplierName = row.original.supplier?.name;
      return (
        <p className="truncate font-medium w-48">
          {displayValue(supplierName)}
        </p>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
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
    cell: ({ row }) => <DataTablePartRowActions row={row} />,
  },
];

export { tablePartCollumns };
