"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";

import { DataTableColumnHeader } from "@/app/(protected)/_components/shared/tanstack-table/data-table-collumn-header";
import {
  IdCell,
  shortId,
} from "@/app/(protected)/_components/shared/tanstack-table/id-cell";

import { formatAccountPayableCategory } from "@/lib/account-payable-category";
import {
  displayValue,
  formatDateOnly,
  formatNotificationDate,
  formatToBrazilianCurrency,
} from "@/lib/format-values";

import type { AccountPayableRow } from "../lib/server-table";
import { payeeLabel } from "../lib/stats-data";
import { statusMetaOf } from "../lib/status";
import { AccountPayableRowActions } from "./row-actions";

const text = (value: string | null | undefined, width: string) => (
  <p className={`truncate font-medium ${width}`} title={value ?? undefined}>
    {displayValue(value)}
  </p>
);

const money = (value: number | null | undefined, width = "w-28") =>
  text(
    value === null || value === undefined
      ? null
      : formatToBrazilianCurrency(value),
    width,
  );

/**
 * The bill columns, one set for /admin and /dashboard. Column ids are the
 * API's sort keys and facets (ACCOUNT_PAYABLE_TABLE). The status badge is
 * the API's answer by the company's business day; the due and payment days
 * come as the company's day keys and are printed as days, never shifted by
 * the browser's zone.
 */
function buildAccountPayableColumns(): ColumnDef<AccountPayableRow>[] {
  return [
    {
      // The bill's own number (invoice, boleto): what the supplier quotes.
      // A bill registered without one shows its compact record id.
      id: "document_number",
      accessorKey: "document_number",
      meta: { title: "Nº do documento" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nº do documento" />
      ),
      cell: ({ row }) =>
        row.original.document_number ? (
          text(row.original.document_number, "w-32")
        ) : (
          <IdCell id={row.original.id} />
        ),
      enableHiding: false,
    },
    {
      id: "status",
      accessorKey: "status",
      meta: { title: "Situação" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Situação" />
      ),
      cell: ({ row }) => {
        const meta = statusMetaOf(row.original.status);

        return (
          <Badge
            variant="outline"
            className={`whitespace-nowrap ${meta.className}`}
          >
            {meta.label}
          </Badge>
        );
      },
      enableHiding: false,
    },
    {
      id: "payee",
      meta: { title: "Favorecido" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Favorecido" />
      ),
      cell: ({ row }) => text(payeeLabel(row.original), "w-48"),
    },
    {
      id: "category",
      accessorKey: "category",
      meta: { title: "Categoria" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Categoria" />
      ),
      cell: ({ row }) => {
        const { category, category_description } = row.original;

        return text(
          category === "OTHER" && category_description
            ? `Outros (${category_description})`
            : formatAccountPayableCategory(category),
          "w-40",
        );
      },
    },
    {
      id: "due_date",
      accessorKey: "due_date",
      meta: { title: "Vencimento" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Vencimento" />
      ),
      cell: ({ row }) => text(formatDateOnly(row.original.due_day), "w-28"),
    },
    {
      id: "amount",
      accessorKey: "amount",
      meta: { title: "Valor total" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Valor" />
      ),
      cell: ({ row }) => money(row.original.amount),
    },
    {
      id: "amount_paid",
      accessorKey: "amount_paid",
      meta: { title: "Valor pago" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Valor pago" />
      ),
      cell: ({ row }) => money(row.original.amount_paid),
    },
    {
      id: "remaining_amount",
      meta: { title: "Valor restante" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Valor restante" />
      ),
      cell: ({ row }) => money(row.original.remaining_amount, "w-32"),
    },
    {
      id: "payment_date",
      accessorKey: "payment_date",
      meta: { title: "Pagamento" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Pagamento" />
      ),
      cell: ({ row }) =>
        text(
          row.original.payment_day
            ? formatDateOnly(row.original.payment_day)
            : null,
          "w-28",
        ),
    },
    {
      id: "vehicle",
      meta: { title: "Veículo (centro de custo)" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Veículo" />
      ),
      cell: ({ row }) => text(row.original.vehicle?.license_plate, "w-24"),
    },
    {
      id: "description",
      accessorKey: "description",
      meta: { title: "Descrição" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Descrição" />
      ),
      cell: ({ row }) => text(row.original.description, "w-56"),
    },
    {
      id: "branch",
      meta: { title: "Filial" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Filial" />
      ),
      cell: ({ row }) =>
        text(
          row.original.branch?.fantasy_name ||
            row.original.branch?.corporate_reason,
          "w-44",
        ),
    },
    {
      id: "responsible",
      meta: { title: "Responsável" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Responsável" />
      ),
      cell: ({ row }) => text(row.original.registrationUser?.name, "w-40"),
    },
    {
      id: "createdBy",
      meta: { title: "Registrada por" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Registrada por" />
      ),
      cell: ({ row }) => text(row.original.createdBy?.name, "w-40"),
    },
    {
      id: "serviceOrder",
      meta: { title: "Ordem de serviço" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Ordem de serviço" />
      ),
      cell: ({ row }) =>
        text(
          row.original.serviceOrderId
            ? `OS #${shortId(row.original.serviceOrderId)}`
            : null,
          "w-36",
        ),
    },
    {
      id: "issue_date",
      accessorKey: "issue_date",
      meta: { title: "Emissão" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Emissão" />
      ),
      cell: ({ row }) =>
        text(formatNotificationDate(row.original.issue_date, "pt-BR"), "w-36"),
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
      id: "Ações",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Ações" />
      ),
      cell: ({ row }) => <AccountPayableRowActions row={row} />,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}

export { buildAccountPayableColumns };
