"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";

import { Badge } from "@/components/ui/badge";

import { driverTableSchema } from "@/schemas/driver-table-schema";
import { DataTableColumnHeader } from "../../../tanstack-table/data-table-collumn-header";

import { DataTableDriverRowActions } from "../data-table-row-actions";
import { formatDate } from "@/lib/format-values";

// Labels and colors for driver status badges
const statusLabels = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
} as const;

const statusColors = {
  ACTIVE: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
  INACTIVE: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200",
} as const;

const tableDriverCollumns: ColumnDef<driverTableSchema>[] = [
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
    accessorKey: "status",
    meta: {
      title: "Status",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as keyof typeof statusLabels;
      return (
        <Badge variant="outline" className={statusColors[status]}>
          {statusLabels[status] || status || "N/A"}
        </Badge>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    meta: {
      title: "Nome do motorista",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome do motorista" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-44">
          {row.getValue("name") ?? "N/A"}
        </p>
      );
    },
  },
  {
    accessorKey: "birth_date",
    meta: {
      title: "Data de nascimento",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Data de nascimento" />
    ),
    cell: ({ row }) => {
      return (
        <p className=" truncate font-medium w-24">
          {formatDate(row.getValue("birth_date"), "pt-BR") ?? "N/A"}
        </p>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "cnh",
    meta: {
      title: "CNH",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="CNH" />
    ),
    cell: ({ row }) => {
      return (
        <p className=" truncate font-medium w-24">
          {row.getValue("cnh") ?? "N/A"}
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
    accessorKey: "cpf",
    meta: {
      title: "CPF",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="CPF" />
    ),
    cell: ({ row }) => {
      return (
        <p className=" truncate font-medium w-24">
          {row.getValue("cpf") ?? "N/A"}
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
    accessorKey: "rg",
    meta: {
      title: "RG",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="RG" />
    ),
    cell: ({ row }) => {
      return (
        <p className=" truncate font-medium w-24">
          {row.getValue("rg") ?? "N/A"}
        </p>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "cep",
    meta: {
      title: "CEP",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="CEP" />
    ),
    cell: ({ row }) => {
      return (
        <p className=" truncate font-medium w-24">
          {row.getValue("cep") ?? "N/A"}
        </p>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "city",
    meta: {
      title: "Cidade",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Cidade" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-28">
          {row.getValue("city") ?? "N/A"}
        </p>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "uf",
    meta: {
      title: "UF",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="UF" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-8">
          {row.getValue("uf") ?? "N/A"}
        </p>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "street",
    meta: {
      title: "Rua",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Rua" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-32">
          {row.getValue("street") ?? "N/A"}
        </p>
      );
    },
  },
  {
    accessorKey: "address_number",
    meta: {
      title: "Número",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Número do endereço" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-28">
          {row.getValue("address_number") ?? "N/A"}
        </p>
      );
    },
  },
  {
    accessorKey: "complement",
    meta: {
      title: "Complemento",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Complemento" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-64">
          {row.getValue("complement") ?? "N/A"}
        </p>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "contract_type",
    meta: {
      title: "Tipo do contrato",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tipo do contrato" />
    ),
    cell: ({ row }) => {
      return (
        <p className=" truncate font-medium w-24">
          {row.getValue("contract_type") === "OWNED"
            ? "Próprio"
            : "Terceirizado"}
        </p>
      );
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
          {row.getValue("businessId") ?? "N/A"}
        </p>
      );
    },
  },
  {
    accessorKey: "business_name",
    meta: {
      title: "Nome da empresa",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome da empresa" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-48">
          {row.getValue("business_name") ?? "N/A"}
        </p>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "branchId",
    meta: {
      title: "Identificador da filial",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Identificador da filial" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-48">
          {row.getValue("branchId") ?? "N/A"}
        </p>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "branchName",
    meta: {
      title: "Nome da filial",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome da filial" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-48">
          {row.getValue("branchName") ?? "N/A"}
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
    cell: ({ row }) => <DataTableDriverRowActions row={row} />,
  },
];

export { tableDriverCollumns };
