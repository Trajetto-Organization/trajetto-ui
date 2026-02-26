"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";

import { Badge } from "@/components/ui/badge";

import { driverTableSchema } from "@/schemas/driver-table-schema";
import { DataTableColumnHeader } from "../../../tanstack-table/data-table-collumn-header";

import { DataTableDriverRowActions } from "../data-table-row-actions";
import {
  displayValue,
  formatDate,
  formatNotificationDate,
  formatCpf,
  formatRg,
  formatCep,
} from "@/lib/format-values";

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
        id="select-all-drivers"
        name="select-all-drivers"
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
        id={`select-driver-${row.id}`}
        name={`select-driver-${row.id}`}
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
          {displayValue(statusLabels[status])}
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
          {displayValue(row.getValue("name"))}
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
        <p className="truncate font-medium w-24">
          {displayValue(formatDate(row.getValue("birth_date"), "pt-BR"))}
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
        <p className="truncate font-medium w-24">
          {displayValue(row.getValue("cnh"))}
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
        <p className="truncate font-medium w-24">
          {displayValue(formatCpf(row.getValue("cpf")))}
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
        <p className="truncate font-medium w-24">
          {displayValue(formatRg(row.getValue("rg")))}
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
        <p className="truncate font-medium w-24">
          {displayValue(formatCep(row.getValue("cep")))}
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
          {displayValue(row.getValue("city"))}
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
          {displayValue(row.getValue("uf"))}
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
          {displayValue(row.getValue("street"))}
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
          {displayValue(row.getValue("address_number"))}
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
          {displayValue(row.getValue("complement"))}
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
      const contractType =
        row.getValue("contract_type") === "OWNED" ? "Próprio" : "Terceirizado";

      return (
        <p className="truncate font-medium w-24">
          {displayValue(contractType)}
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
          {displayValue(row.getValue("branchId"))}
        </p>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "branchName",
    accessorFn: (row) => row.branch?.corporate_reason,
    meta: {
      title: "Nome da filial",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome da filial" />
    ),
    cell: ({ row }) => {
      const branchName = row.original.branch?.corporate_reason;
      return (
        <p className="truncate font-medium w-48">{displayValue(branchName)}</p>
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
    cell: ({ row }) => <DataTableDriverRowActions row={row} />,
  },
];

export { tableDriverCollumns };
