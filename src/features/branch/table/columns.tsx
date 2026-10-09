"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { Checkbox } from "@/components/ui/checkbox";

import { DataTableColumnHeader } from "@/app/(protected)/_components/shared/tanstack-table/data-table-collumn-header";

import {
  displayValue,
  formatCep,
  formatCnpj,
  formatNotificationDate,
  formatTelephone,
} from "@/lib/format-values";

import type { BranchScope } from "../lib/scope";
import type { BranchRow } from "../lib/server-table";
import { BranchRowActions } from "./row-actions";
import { ToggleBranchActiveCell } from "./toggle-active-cell";

const text = (value: string | null | undefined, width: string) => (
  <p className={`truncate font-medium ${width}`}>{displayValue(value)}</p>
);

/**
 * The branch columns, one set for /admin and /dashboard. Column ids are the
 * API's sort keys and facets (BRANCH_TABLE), so sorting and the status/UF
 * filters go to the server. The admin copy's company columns are gone: the
 * page shows one company, the one selected at the top.
 */
function buildBranchColumns(scope: BranchScope): ColumnDef<BranchRow>[] {
  return [
    {
      id: "select",
      meta: { title: "Seleção" },
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Selecionar todas"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Selecionar linha"
          className="translate-y-[2px]"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "id",
      accessorKey: "id",
      meta: { title: "Identificador" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Identificador" />
      ),
      cell: ({ row }) => text(row.original.id, "w-72"),
      enableHiding: false,
    },
    {
      id: "is_active",
      accessorKey: "is_active",
      meta: { title: "Status" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <ToggleBranchActiveCell
          branchId={row.original.id}
          businessId={row.original.businessId}
          isActive={row.original.is_active ?? true}
        />
      ),
    },
    {
      id: "corporate_reason",
      accessorKey: "corporate_reason",
      meta: { title: "Razão Social" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Razão social" />
      ),
      cell: ({ row }) => text(row.original.corporate_reason, "w-64"),
    },
    {
      id: "fantasy_name",
      accessorKey: "fantasy_name",
      meta: { title: "Nome Fantasia" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nome fantasia" />
      ),
      cell: ({ row }) => text(row.original.fantasy_name, "w-64"),
    },
    {
      id: "cep",
      accessorKey: "cep",
      meta: { title: "CEP" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="CEP" />
      ),
      cell: ({ row }) => text(formatCep(row.original.cep), "w-24"),
    },
    {
      id: "city",
      accessorKey: "city",
      meta: { title: "Cidade" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Cidade" />
      ),
      cell: ({ row }) => text(row.original.city, "w-28"),
    },
    {
      id: "uf",
      accessorKey: "uf",
      meta: { title: "UF" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="UF" />
      ),
      cell: ({ row }) => text(row.original.uf, "w-8"),
    },
    {
      id: "street",
      accessorKey: "street",
      meta: { title: "Rua" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Rua" />
      ),
      cell: ({ row }) => text(row.original.street, "w-32"),
    },
    {
      id: "address_number",
      accessorKey: "address_number",
      meta: { title: "Número" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Número" />
      ),
      cell: ({ row }) => text(row.original.address_number, "w-20"),
    },
    {
      id: "cnpj",
      accessorKey: "cnpj",
      meta: { title: "CNPJ" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="CNPJ" />
      ),
      cell: ({ row }) => text(formatCnpj(row.original.cnpj), "w-36"),
    },
    {
      id: "complement",
      accessorKey: "complement",
      meta: { title: "Complemento" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Complemento" />
      ),
      cell: ({ row }) => text(row.original.complement, "w-48"),
    },
    {
      id: "cnae",
      accessorKey: "cnae",
      meta: { title: "CNAE" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="CNAE" />
      ),
      cell: ({ row }) => text(row.original.cnae, "w-16"),
    },
    {
      id: "erp_code",
      accessorKey: "erp_code",
      meta: { title: "Código ERP" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Código ERP" />
      ),
      cell: ({ row }) => text(row.original.erp_code, "w-32"),
    },
    {
      id: "responsible_name",
      accessorKey: "responsible_name",
      meta: { title: "Responsável" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Responsável" />
      ),
      cell: ({ row }) => text(row.original.responsible_name, "w-44"),
    },
    {
      id: "telephone",
      accessorKey: "telephone",
      meta: { title: "Telefone" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Telefone" />
      ),
      cell: ({ row }) => text(formatTelephone(row.original.telephone), "w-36"),
    },
    {
      id: "email",
      accessorKey: "email",
      meta: { title: "E-mail" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="E-mail" />
      ),
      cell: ({ row }) => text(row.original.email, "w-48"),
    },
    {
      id: "created_at",
      accessorKey: "created_at",
      meta: { title: "Criação" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Criação" />
      ),
      cell: ({ row }) =>
        text(formatNotificationDate(row.original.created_at, "pt-BR"), "w-36"),
    },
    {
      id: "updated_at",
      accessorKey: "updated_at",
      meta: { title: "Atualização" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Atualização" />
      ),
      cell: ({ row }) =>
        text(formatNotificationDate(row.original.updated_at, "pt-BR"), "w-36"),
    },
    {
      id: "Ações",
      cell: ({ row }) => <BranchRowActions row={row} scope={scope} />,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}

export { buildBranchColumns };
