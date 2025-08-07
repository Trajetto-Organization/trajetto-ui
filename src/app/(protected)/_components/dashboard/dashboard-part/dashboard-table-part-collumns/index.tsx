"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";

import { partTableSchema } from "@/schemas/part-table-schema";
import { DataTableColumnHeader } from "../../../tanstack-table/data-table-collumn-header";

import { DashboardDataTablePartRowActions } from "../dashboard-data-table-row-actions";

const dashboardTablePartCollumns: ColumnDef<partTableSchema>[] = [
  {
    id: "select",
    meta: {
      title: "Seleção",
    },
    header: ({ table }) => (
      <Checkbox
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
      <p className="truncate font-medium w-72">{row.getValue("id") ?? "N/A"}</p>
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
          {row.getValue("description") ?? "N/A"}
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
        <p className=" truncate font-medium w-24">
          {row.getValue("unit_price") ?? "N/A"}
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
          {row.getValue("supplierId") ?? "N/A"}
        </p>
      );
    },
  },
  {
    accessorKey: "supplierName",
    meta: {
      title: "Nome do fornecedor",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome do fornecedor" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-48">
          {row.getValue("supplierName") ?? "N/A"}
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
      <p className="truncate font-medium w-24">
        {row.getValue("created_at") ?? "N/A"}
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
      <p className="truncate font-medium w-24">
        {row.getValue("updated_at") ?? "N/A"}
      </p>
    ),
  },
  {
    id: "Ações",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ações" />
    ),
    cell: ({ row }) => <DashboardDataTablePartRowActions row={row} />,
  },
];

export { dashboardTablePartCollumns };
