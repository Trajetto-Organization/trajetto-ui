"use client";

import type { ColumnDef, HeaderContext } from "@tanstack/react-table";
import { TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/app/(protected)/_components/shared/tanstack-table/data-table-collumn-header";
import { IdCell } from "@/app/(protected)/_components/shared/tanstack-table/id-cell";

import {
  displayValue,
  formatNotificationDate,
  formatToBrazilianCurrency,
} from "@/lib/format-values";
import { formatPickedDay } from "@/features/vehicle/lib/picked-day";

import {
  MAINTENANCE_TYPE_LABELS,
  SERVICE_ORDER_STATUS_LABELS,
  amountOf,
  partsExceedTotal,
  serviceOrderStatusOf,
  type FleetScope,
} from "./lib/service-order-rules";
import type { ServiceOrderRow } from "./server-table";
import { ServiceOrderRowActions } from "./row-actions";

/**
 * The service order table, one for /admin and /dashboard. Sortable and
 * filterable column ids are the API's keys (SERVICE_ORDER_TABLE): only those
 * sort, and the filters travel as URL params to the server.
 */
function header(title: string) {
  const Header = ({ column }: HeaderContext<ServiceOrderRow, unknown>) => (
    <DataTableColumnHeader column={column} title={title} />
  );

  return Header;
}

const text = (value: unknown, width: string) => (
  <p
    className={`truncate font-medium ${width}`}
    title={typeof value === "string" ? value : undefined}
  >
    {displayValue(value as string)}
  </p>
);

const buildServiceOrderColumns = (
  scope: FleetScope,
): ColumnDef<ServiceOrderRow>[] => [
  {
    // A service order has no number of its own: the compact record id, the
    // same "OS #…" the pickers and Contas a pagar show.
    accessorKey: "id",
    meta: { title: "ID" },
    header: header("ID"),
    cell: ({ row }) => <IdCell id={row.original.id} />,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "date",
    meta: { title: "Data da ordem" },
    header: header("Data da ordem"),
    cell: ({ row }) => text(formatPickedDay(row.original.date), "w-32"),
  },
  {
    id: "status",
    accessorFn: (row) => serviceOrderStatusOf(row),
    meta: { title: "Situação" },
    header: header("Situação"),
    cell: ({ row }) =>
      serviceOrderStatusOf(row.original) === "completed" ? (
        <Badge
          variant="outline"
          className="border-green-200 bg-green-100 text-green-800"
        >
          {SERVICE_ORDER_STATUS_LABELS.completed}
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className="border-amber-200 bg-amber-100 text-amber-800"
        >
          {SERVICE_ORDER_STATUS_LABELS.open}
        </Badge>
      ),
  },
  {
    accessorKey: "completion_date",
    meta: { title: "Data de conclusão" },
    header: header("Data de conclusão"),
    cell: ({ row }) =>
      text(formatPickedDay(row.original.completion_date), "w-32"),
  },
  {
    accessorKey: "maintenance_type",
    meta: { title: "Tipo de manutenção" },
    header: header("Tipo de manutenção"),
    // Where the work is done, not its nature (FLEET-SO-3).
    cell: ({ row }) =>
      text(MAINTENANCE_TYPE_LABELS[row.original.maintenance_type], "w-28"),
    enableHiding: false,
  },
  {
    accessorKey: "total_amount",
    meta: { title: "Valor total" },
    header: header("Valor total"),
    cell: ({ row }) => {
      const exceeded = partsExceedTotal(row.original);

      return (
        <div className="flex w-36 items-center gap-1.5">
          {exceeded && (
            <TriangleAlert
              className="h-3.5 w-3.5 shrink-0 text-amber-600"
              aria-label="As peças passam do valor total"
            />
          )}
          <p
            className="truncate font-medium"
            title={
              exceeded
                ? `As peças lançadas somam ${formatToBrazilianCurrency(row.original.parts_total ?? 0)}, mais que o valor total da ordem. Revise o valor.`
                : undefined
            }
          >
            {formatToBrazilianCurrency(amountOf(row.original.total_amount))}
          </p>
        </div>
      );
    },
    enableHiding: false,
  },
  {
    id: "parts_total",
    accessorFn: (row) => row.parts_total ?? 0,
    meta: { title: "Total das peças" },
    header: header("Total das peças"),
    cell: ({ row }) =>
      text(
        `${formatToBrazilianCurrency(row.original.parts_total ?? 0)} (${row.original.parts_count ?? row.original.parts?.length ?? 0})`,
        "w-36",
      ),
  },
  {
    id: "vehicleLicensePlate",
    accessorFn: (row) => row.vehicle?.license_plate,
    meta: { title: "Placa do veículo" },
    header: header("Placa do veículo"),
    cell: ({ row }) => text(row.original.vehicle?.license_plate, "w-28"),
  },
  {
    id: "vehicleDescription",
    accessorFn: (row) => row.vehicle?.description,
    meta: { title: "Descrição do veículo" },
    header: header("Descrição do veículo"),
    cell: ({ row }) => text(row.original.vehicle?.description, "w-48"),
  },
  {
    accessorKey: "description",
    meta: { title: "Descrição" },
    header: header("Descrição"),
    cell: ({ row }) => text(row.original.description, "w-56"),
  },
  {
    id: "responsibleUserName",
    accessorFn: (row) => row.responsibleUser?.name,
    meta: { title: "Responsável" },
    header: header("Responsável"),
    cell: ({ row }) => text(row.original.responsibleUser?.name, "w-40"),
  },
  {
    id: "responsibleUserEmail",
    accessorFn: (row) => row.responsibleUser?.email,
    meta: { title: "E-mail do responsável" },
    header: header("E-mail do responsável"),
    cell: ({ row }) => text(row.original.responsibleUser?.email, "w-48"),
  },
  {
    id: "supplierName",
    accessorFn: (row) => row.supplier?.name,
    meta: { title: "Fornecedor" },
    header: header("Fornecedor"),
    cell: ({ row }) => text(row.original.supplier?.name, "w-44"),
  },
  {
    id: "branchName",
    accessorFn: (row) => row.branch?.corporate_reason,
    meta: { title: "Filial" },
    header: header("Filial"),
    cell: ({ row }) => text(row.original.branch?.corporate_reason, "w-44"),
  },
  {
    id: "accounts_payable_count",
    accessorFn: (row) => row.accounts_payable_count ?? 0,
    meta: { title: "Contas a pagar" },
    header: header("Contas a pagar"),
    cell: ({ row }) =>
      text(String(row.original.accounts_payable_count ?? 0), "w-24"),
  },
  {
    accessorKey: "latitude",
    meta: { title: "Latitude" },
    header: header("Latitude"),
    cell: ({ row }) => text(row.original.latitude, "w-28"),
  },
  {
    accessorKey: "longitude",
    meta: { title: "Longitude" },
    header: header("Longitude"),
    cell: ({ row }) => text(row.original.longitude, "w-28"),
  },
  {
    accessorKey: "created_at",
    meta: { title: "Criação" },
    header: header("Data de criação"),
    cell: ({ row }) =>
      text(formatNotificationDate(row.original.created_at, "pt-BR"), "w-36"),
  },
  {
    accessorKey: "updated_at",
    meta: { title: "Atualização" },
    header: header("Data de atualização"),
    cell: ({ row }) =>
      text(formatNotificationDate(row.original.updated_at, "pt-BR"), "w-36"),
  },
  {
    id: "actions",
    meta: { title: "Ações" },
    header: header("Ações"),
    cell: ({ row }) => (
      <ServiceOrderRowActions scope={scope} serviceOrder={row.original} />
    ),
    enableHiding: false,
  },
];

export { buildServiceOrderColumns };
