"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";

import { supplierTableSchema } from "@/schemas/supplier-table-schema";
import { DataTableColumnHeader } from "../../../tanstack-table/data-table-collumn-header";

import { DataTableSupplierRowActions } from "../data-table-row-actions";

import {
  displayValue,
  formatCnpj,
  formatCep,
  formatTelephone,
  formatNotificationDate,
} from "@/lib/format-values";

const tableSupplierCollumns: ColumnDef<supplierTableSchema>[] = [
  {
    id: "select",
    meta: {
      title: "Seleção",
    },
    header: ({ table }) => (
      <Checkbox
        id="select-all-suppliers"
        name="select-all-suppliers"
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
        id={`select-supplier-${row.id}`}
        name={`select-supplier-${row.id}`}
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
    meta: {
      title: "Fornecedor",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome do fornecedor" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-44">
          {displayValue(row.getValue("name"))}
        </p>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "cnpj",
    meta: {
      title: "CNPJ",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="CNPJ" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-36">
          {displayValue(formatCnpj(row.getValue("cnpj")))}
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
    accessorKey: "telephone",
    meta: {
      title: "Telefone",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Telefone" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-36">
          {displayValue(formatTelephone(row.getValue("telephone")))}
        </p>
      );
    },
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
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-48">
          {displayValue(row.getValue("email"))}
        </p>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
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
    cell: ({ row }) => <DataTableSupplierRowActions row={row} />,
  },
];

export { tableSupplierCollumns };
