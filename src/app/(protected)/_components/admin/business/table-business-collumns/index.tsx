"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";

import { businessTableSchema } from "@/schemas/business-table-schema";
import { DataTableColumnHeader } from "../../../tanstack-table/data-table-collumn-header";

import { DataTableBusinessRowActions } from "../data-table-row-actions";
import {
  formatCep,
  formatCnpj,
  formatNotificationDate,
  formatTelephone,
  displayValue,
} from "@/lib/format-values";

const tableBusinessCollumns: ColumnDef<businessTableSchema>[] = [
  {
    id: "select",
    meta: {
      title: "Seleção",
    },
    header: ({ table }) => (
      <Checkbox
        id="select-all-business"
        name="select-all-business"
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
        id={`select-business-${row.id}`}
        name={`select-business-${row.id}`}
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
    accessorKey: "corporate_reason",
    meta: {
      title: "Razão Social",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Razão social" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-64">
        {displayValue(row.getValue("corporate_reason"))}
      </p>
    ),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "fantasy_name",
    meta: {
      title: "Nome Fantasia",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome Fantasia" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-64">
        {displayValue(row.getValue("fantasy_name"))}
      </p>
    ),
  },
  {
    accessorKey: "cep",
    meta: {
      title: "CEP",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="CEP" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-24">
        {displayValue(formatCep(row.getValue("cep")))}
      </p>
    ),
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
    cell: ({ row }) => (
      <p className="truncate font-medium w-28">
        {displayValue(row.getValue("city"))}
      </p>
    ),
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
    cell: ({ row }) => (
      <p className="truncate font-medium w-8">
        {displayValue(row.getValue("uf"))}
      </p>
    ),
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
    cell: ({ row }) => (
      <p className="truncate font-medium w-32">
        {displayValue(row.getValue("street"))}
      </p>
    ),
  },
  {
    accessorKey: "address_number",
    meta: {
      title: "Número",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Número do endereço" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-28">
        {displayValue(row.getValue("address_number"))}
      </p>
    ),
  },
  {
    accessorKey: "cnpj",
    meta: {
      title: "CNPJ",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="CNPJ" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-36">
        {displayValue(formatCnpj(row.getValue("cnpj")))}
      </p>
    ),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "complement",
    meta: {
      title: "Complemento",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Complemento" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-64">
        {displayValue(row.getValue("complement"))}
      </p>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "cnae",
    meta: {
      title: "CNAE",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="CNAE" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-16">
        {displayValue(row.getValue("cnae"))}
      </p>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "erp_code",
    meta: {
      title: "Código ERP",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Código ERP" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-40">
        {displayValue(row.getValue("erp_code"))}
      </p>
    ),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "responsible_name",
    meta: {
      title: "Responsável",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome do responsável" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-44">
        {displayValue(row.getValue("responsible_name"))}
      </p>
    ),
  },
  {
    accessorKey: "telephone",
    meta: {
      title: "Telefone",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Telefone" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-36">
        {displayValue(formatTelephone(row.getValue("telephone")))}
      </p>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "email",
    meta: {
      title: "E-mail",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="E-mail" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-48">
        {displayValue(row.getValue("email"))}
      </p>
    ),
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
    cell: ({ row }) => <DataTableBusinessRowActions row={row} />,
  },
];

export { tableBusinessCollumns };
