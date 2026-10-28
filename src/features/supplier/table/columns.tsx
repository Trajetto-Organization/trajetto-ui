"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { DataTableColumnHeader } from "@/app/(protected)/_components/shared/tanstack-table/data-table-collumn-header";

import {
  displayValue,
  formatCep,
  formatCnpj,
  formatNotificationDate,
  formatTelephone,
} from "@/lib/format-values";

import type { SupplierRow } from "../lib/server-table";
import { SupplierRowActions } from "./row-actions";

const text = (value: string | null | undefined, width: string) => (
  <p className={`truncate font-medium ${width}`}>{displayValue(value)}</p>
);

/**
 * The supplier columns, one set for /admin and /dashboard. Column ids are the
 * API's sort keys and facet (SUPPLIER_TABLE), so sorting and the UF filter
 * go to the server. The admin copy's company columns are gone: the page
 * shows one company, the one selected at the top.
 */
function buildSupplierColumns(): ColumnDef<SupplierRow>[] {
  return [
    {
      // The CNPJ is the supplier's identifier, the one on its invoices.
      id: "cnpj",
      accessorKey: "cnpj",
      meta: { title: "CNPJ" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="CNPJ" />
      ),
      cell: ({ row }) => text(formatCnpj(row.original.cnpj), "w-40"),
      enableHiding: false,
    },
    {
      id: "name",
      accessorKey: "name",
      meta: { title: "Nome" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nome" />
      ),
      cell: ({ row }) => text(row.original.name, "w-56"),
    },
    {
      id: "email",
      accessorKey: "email",
      meta: { title: "E-mail" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="E-mail" />
      ),
      cell: ({ row }) => text(row.original.email, "w-56"),
    },
    {
      id: "telephone",
      accessorKey: "telephone",
      meta: { title: "Telefone" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Telefone" />
      ),
      cell: ({ row }) =>
        text(
          row.original.telephone
            ? formatTelephone(row.original.telephone)
            : null,
          "w-36",
        ),
    },
    {
      id: "city",
      accessorKey: "city",
      meta: { title: "Cidade" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Cidade" />
      ),
      cell: ({ row }) => text(row.original.city, "w-36"),
    },
    {
      id: "uf",
      accessorKey: "uf",
      meta: { title: "UF" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="UF" />
      ),
      cell: ({ row }) => text(row.original.uf, "w-12"),
    },
    {
      id: "cep",
      accessorKey: "cep",
      meta: { title: "CEP" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="CEP" />
      ),
      cell: ({ row }) =>
        text(row.original.cep ? formatCep(row.original.cep) : null, "w-24"),
    },
    {
      id: "street",
      accessorKey: "street",
      meta: { title: "Endereço" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Endereço" />
      ),
      cell: ({ row }) => {
        const { street, address_number, complement } = row.original;
        const address = street
          ? [street, address_number, complement].filter(Boolean).join(", ")
          : null;

        return text(address, "w-64");
      },
    },
    {
      id: "created_at",
      accessorKey: "created_at",
      meta: { title: "Criação" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Data de criação" />
      ),
      cell: ({ row }) =>
        text(formatNotificationDate(row.original.created_at, "pt-BR"), "w-36"),
    },
    {
      id: "updated_at",
      accessorKey: "updated_at",
      meta: { title: "Atualização" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Data de atualização" />
      ),
      cell: ({ row }) =>
        text(formatNotificationDate(row.original.updated_at, "pt-BR"), "w-36"),
    },
    {
      id: "Ações",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Ações" />
      ),
      cell: ({ row }) => <SupplierRowActions row={row} />,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}

export { buildSupplierColumns };
