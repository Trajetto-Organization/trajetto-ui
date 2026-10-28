"use client";

import { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/app/(protected)/_components/shared/tanstack-table/data-table-collumn-header";

import {
  displayValue,
  formatCpf,
  formatDateOnly,
  formatNotificationDate,
  formatToBrazilianCurrency,
} from "@/lib/format-values";

import { FINE_STATUS_META } from "./lib/status";
import type { FineRow } from "./lib/types";

import { FineRowActions } from "./row-actions";

const fullCode = (row: FineRow) =>
  `${row.trafficViolationCode.code}-${row.trafficViolationCode.sub_code}`;

/**
 * The fines table, one set of columns for /admin and /dashboard.
 *
 * The ids of the sortable and filterable columns are the API's keys
 * (FINE_TABLE in ./lib/server-table): only those sort, and the filters
 * travel as URL params. The company column of the old /admin copy is gone:
 * the list is always one company now, the one picked above.
 *
 * The three dates show the day the API names in the company's zone
 * (`*_day`), the one the status, the rules and the export use: the instant
 * formatted in the viewer's zone could name the day before.
 */
const buildFineColumns = (): ColumnDef<FineRow>[] => [
  // A fine has no number of its own (the AIT is not stored): the vehicle,
  // the violation and its day tell one from another.
  {
    id: "vehicleLicensePlate",
    accessorFn: (row) => row.vehicle.license_plate,
    meta: { title: "Placa" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Placa" />
    ),
    cell: ({ row }) => (
      <p className="w-24 truncate font-medium">
        {displayValue(row.original.vehicle.license_plate)}
      </p>
    ),
    enableHiding: false,
  },
  {
    id: "violationCode",
    accessorFn: fullCode,
    meta: { title: "Código da infração" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Código da infração" />
    ),
    cell: ({ row }) => (
      <p className="w-28 truncate font-medium">{fullCode(row.original)}</p>
    ),
    enableHiding: false,
  },
  {
    id: "violation_date",
    accessorFn: (row) => row.violation_date,
    meta: { title: "Data da infração" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Data da infração" />
    ),
    cell: ({ row }) => (
      <p className="w-32 truncate font-medium">
        {formatDateOnly(row.original.violation_day)}
      </p>
    ),
    enableHiding: false,
  },
  {
    id: "status",
    accessorFn: (row) => row.status,
    meta: { title: "Situação" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Situação" />
    ),
    cell: ({ row }) => {
      const meta = FINE_STATUS_META[row.original.status];

      return meta ? (
        <Badge variant="outline" className={meta.className}>
          {meta.label}
        </Badge>
      ) : (
        <span>N/A</span>
      );
    },
  },
  {
    id: "due_date",
    accessorFn: (row) => row.due_date,
    meta: { title: "Vencimento" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Vencimento" />
    ),
    cell: ({ row }) => (
      <p className="w-32 truncate font-medium">
        {formatDateOnly(row.original.due_day)}
      </p>
    ),
  },
  {
    id: "payment_date",
    accessorFn: (row) => row.payment_date,
    meta: { title: "Pagamento" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Pagamento" />
    ),
    cell: ({ row }) => (
      <p className="w-32 truncate font-medium">
        {row.original.payment_day
          ? formatDateOnly(row.original.payment_day)
          : "Não paga"}
      </p>
    ),
  },
  {
    id: "amount",
    accessorFn: (row) => row.amount,
    meta: { title: "Valor" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Valor" />
    ),
    cell: ({ row }) => (
      <p className="w-28 truncate font-medium">
        {formatToBrazilianCurrency(Number(row.original.amount))}
      </p>
    ),
  },
  {
    id: "points",
    accessorFn: (row) => row.points,
    meta: { title: "Pontos" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Pontos" />
    ),
    cell: ({ row }) => (
      <p className="w-16 truncate font-medium">{row.original.points}</p>
    ),
  },
  {
    id: "violationDescription",
    accessorFn: (row) => row.trafficViolationCode.description,
    meta: { title: "Descrição da infração" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Descrição da infração" />
    ),
    cell: ({ row }) => (
      <p
        className="w-64 truncate font-medium"
        title={row.original.trafficViolationCode.description}
      >
        {displayValue(row.original.trafficViolationCode.description)}
      </p>
    ),
  },
  {
    id: "driverName",
    accessorFn: (row) => row.driver.name,
    meta: { title: "Motorista" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Motorista" />
    ),
    cell: ({ row }) => (
      <p className="w-48 truncate font-medium">
        {displayValue(row.original.driver.name)}
      </p>
    ),
  },
  {
    id: "driverCpf",
    accessorFn: (row) => row.driver.cpf,
    meta: { title: "CPF do motorista" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="CPF do motorista" />
    ),
    cell: ({ row }) => (
      <p className="w-32 truncate font-medium">
        {displayValue(formatCpf(row.original.driver.cpf ?? ""))}
      </p>
    ),
  },
  {
    id: "vehicleDescription",
    accessorFn: (row) => row.vehicle.description,
    meta: { title: "Veículo" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Veículo" />
    ),
    cell: ({ row }) => (
      <p className="w-48 truncate font-medium">
        {displayValue(row.original.vehicle.description)}
      </p>
    ),
  },
  {
    id: "branchName",
    accessorFn: (row) => row.branch.corporate_reason,
    meta: { title: "Filial" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Filial" />
    ),
    cell: ({ row }) => (
      <p className="w-48 truncate font-medium">
        {displayValue(row.original.branch.corporate_reason)}
      </p>
    ),
  },
  {
    id: "location",
    accessorFn: (row) => row.location,
    meta: { title: "Local da infração" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Local da infração" />
    ),
    cell: ({ row }) => (
      <p
        className="w-48 truncate font-medium"
        title={row.original.location ?? undefined}
      >
        {displayValue(row.original.location)}
      </p>
    ),
  },
  {
    id: "latitude",
    accessorFn: (row) => row.latitude,
    meta: { title: "Latitude" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Latitude" />
    ),
    cell: ({ row }) => (
      <p className="w-32 truncate font-medium">
        {displayValue(row.original.latitude)}
      </p>
    ),
  },
  {
    id: "longitude",
    accessorFn: (row) => row.longitude,
    meta: { title: "Longitude" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Longitude" />
    ),
    cell: ({ row }) => (
      <p className="w-32 truncate font-medium">
        {displayValue(row.original.longitude)}
      </p>
    ),
  },
  {
    id: "observation",
    accessorFn: (row) => row.observation,
    meta: { title: "Observações" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Observações" />
    ),
    cell: ({ row }) => (
      <p
        className="w-64 truncate font-medium"
        title={row.original.observation ?? undefined}
      >
        {displayValue(row.original.observation)}
      </p>
    ),
  },
  {
    id: "created_at",
    accessorFn: (row) => row.created_at,
    meta: { title: "Criação" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Criação" />
    ),
    cell: ({ row }) => (
      <p className="w-36 truncate font-medium">
        {displayValue(formatNotificationDate(row.original.created_at, "pt-BR"))}
      </p>
    ),
  },
  {
    id: "updated_at",
    accessorFn: (row) => row.updated_at,
    meta: { title: "Atualização" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Atualização" />
    ),
    cell: ({ row }) => (
      <p className="w-36 truncate font-medium">
        {displayValue(formatNotificationDate(row.original.updated_at, "pt-BR"))}
      </p>
    ),
  },
  {
    id: "actions",
    meta: { title: "Ações" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ações" />
    ),
    cell: ({ row }) => <FineRowActions fine={row.original} />,
    enableHiding: false,
  },
];

export { buildFineColumns };
