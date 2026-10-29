"use client";

import { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";

import { DataTableColumnHeader } from "@/app/(protected)/_components/shared/tanstack-table/data-table-collumn-header";
import { idColumn } from "@/app/(protected)/_components/shared/tanstack-table/id-cell";

import {
  displayValue,
  formatCep,
  formatCpf,
  formatDateOnly,
  formatNotificationDate,
  formatRg,
} from "@/lib/format-values";

import {
  CNH_STATUS_META,
  DRIVER_CONTRACT_LABELS,
  DRIVER_STATUS_LABELS,
  type DriverScope,
} from "../lib/driver-rules";
import type { DriverRow } from "../types";

import { DriverRowActions } from "./row-actions";

const STATUS_COLORS = {
  ACTIVE: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
  INACTIVE: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200",
} as const;

/** A plain text column; its id is the API's sort key where it has one. */
function textColumn(
  key: keyof DriverRow,
  title: string,
  width: string,
  format: (value: unknown) => string = (value) => displayValue(value as string),
  options: Partial<ColumnDef<DriverRow>> = {},
): ColumnDef<DriverRow> {
  return {
    accessorKey: key,
    meta: { title },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={title} />
    ),
    cell: ({ row }) => (
      <p className={`truncate font-medium ${width}`}>
        {format(row.getValue(key))}
      </p>
    ),
    ...options,
  };
}

/**
 * The driver table, one definition for /admin and /dashboard. Column ids are
 * the API's sort and facet keys (features/driver/server-table), so a sorted
 * header or a chosen filter goes to the server, never over the loaded page.
 *
 * The /admin copy carried "empresa" columns from the days it listed every
 * company at once; the list is now one company's, named in the selector.
 */
function buildDriverColumns(mode: DriverScope): ColumnDef<DriverRow>[] {
  return [
    idColumn<DriverRow>(),
    // The CPF identifies a driver across companies and documents; the CNH
    // column below tells homonyms apart too.
    textColumn(
      "cpf",
      "CPF",
      "w-28",
      (value) => displayValue(formatCpf(value as string)),
      { enableHiding: false },
    ),
    {
      accessorKey: "status",
      meta: { title: "Status" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const status = row.original.status;

        return (
          <Badge variant="outline" className={STATUS_COLORS[status]}>
            {displayValue(DRIVER_STATUS_LABELS[status])}
          </Badge>
        );
      },
      enableHiding: false,
    },
    textColumn("name", "Nome do motorista", "w-44"),
    // A civil day stored as UTC midnight: read in UTC, never shifted to
    // the day before by the browser's zone.
    textColumn(
      "birth_date",
      "Data de nascimento",
      "w-24",
      (value) => displayValue(formatDateOnly(value as string)),
      { enableHiding: false },
    ),
    textColumn("cnh", "CNH", "w-24", undefined, { enableHiding: false }),
    textColumn("cnh_category", "Categoria da CNH", "w-24", (value) =>
      value ? String(value) : "Não informada",
    ),
    {
      accessorKey: "cnh_expires_at",
      meta: { title: "Validade da CNH" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Validade da CNH" />
      ),
      cell: ({ row }) => {
        const { cnh_expires_at: expiresAt, cnh_status: status } = row.original;

        if (!expiresAt) {
          return (
            <p className="w-40 truncate text-muted-foreground">Não informada</p>
          );
        }

        // A civil date: read in UTC, never shifted to the previous day.
        return (
          <div className="flex w-52 items-center gap-2">
            <span className="font-medium">{formatDateOnly(expiresAt)}</span>
            {status && status !== "VALID" && (
              <Badge
                variant="outline"
                className={CNH_STATUS_META[status].className}
              >
                {CNH_STATUS_META[status].label}
              </Badge>
            )}
          </div>
        );
      },
    },
    textColumn(
      "rg",
      "RG",
      "w-24",
      (value) => displayValue(formatRg(value as string)),
      { enableHiding: false },
    ),
    textColumn(
      "cep",
      "CEP",
      "w-24",
      (value) => displayValue(formatCep(value as string)),
      { enableHiding: false },
    ),
    textColumn("city", "Cidade", "w-28"),
    textColumn("uf", "UF", "w-8"),
    textColumn("street", "Rua", "w-32"),
    textColumn("address_number", "Número", "w-28"),
    textColumn("complement", "Complemento", "w-64", undefined, {
      enableHiding: false,
    }),
    {
      accessorKey: "contract_type",
      meta: { title: "Tipo do contrato" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Tipo do contrato" />
      ),
      cell: ({ row }) => (
        <p className="w-24 truncate font-medium">
          {displayValue(DRIVER_CONTRACT_LABELS[row.original.contract_type])}
        </p>
      ),
      enableHiding: false,
    },
    {
      id: "branchName",
      accessorFn: (row) => row.branch?.corporate_reason,
      meta: { title: "Nome da filial" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nome da filial" />
      ),
      cell: ({ row }) => (
        <p className="w-48 truncate font-medium">
          {displayValue(row.original.branch?.corporate_reason)}
        </p>
      ),
    },
    textColumn("created_at", "Data de criação", "w-36", (value) =>
      displayValue(formatNotificationDate(value as string, "pt-BR")),
    ),
    textColumn("updated_at", "Data de atualização", "w-36", (value) =>
      displayValue(formatNotificationDate(value as string, "pt-BR")),
    ),
    {
      id: "Ações",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Ações" />
      ),
      cell: ({ row }) => <DriverRowActions driver={row.original} mode={mode} />,
      enableHiding: false,
    },
  ];
}

export { buildDriverColumns };
