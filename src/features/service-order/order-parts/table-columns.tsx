"use client";

import type { ColumnDef, HeaderContext } from "@tanstack/react-table";

import { DataTableColumnHeader } from "@/app/(protected)/_components/shared/tanstack-table/data-table-collumn-header";
import {
  IdCell,
  idColumn,
} from "@/app/(protected)/_components/shared/tanstack-table/id-cell";

import {
  displayValue,
  formatNotificationDate,
  formatToBrazilianCurrency,
} from "@/lib/format-values";
import { formatPickedDay } from "@/features/vehicle/lib/picked-day";

import type { FleetScope } from "../lib/service-order-rules";

import {
  lineTotals,
  numberOf,
  type OrderPartRow,
} from "./lib/order-part-rules";
import { OrderPartRowActions } from "./row-actions";

function header(title: string) {
  const Header = ({ column }: HeaderContext<OrderPartRow, unknown>) => (
    <DataTableColumnHeader column={column} title={title} />
  );

  return Header;
}

const text = (value: unknown, width: string) => (
  <p
    className={"truncate font-medium " + width}
    title={typeof value === "string" ? value : undefined}
  >
    {displayValue(value as string)}
  </p>
);

/** The order-part table; sortable/filterable ids are the API's keys (ORDER_PART_TABLE). */
const buildOrderPartColumns = (
  scope: FleetScope,
): ColumnDef<OrderPartRow>[] => [
  // A part line has no number of its own: the record id identifies it.
  idColumn<OrderPartRow>(),
  {
    id: "partDescription",
    accessorFn: (row) => row.part.description,
    meta: { title: "Peça" },
    header: header("Peça"),
    cell: ({ row }) => text(row.original.part.description, "w-48"),
    enableHiding: false,
  },
  {
    accessorKey: "unit_price",
    meta: { title: "Preço unitário" },
    header: header("Preço unitário"),
    cell: ({ row }) =>
      text(formatToBrazilianCurrency(row.original.unit_price), "w-32"),
  },
  {
    accessorKey: "quantity",
    meta: { title: "Quantidade" },
    header: header("Quantidade"),
    cell: ({ row }) => text(String(row.original.quantity), "w-20"),
  },
  {
    accessorKey: "discount_percentage",
    meta: { title: "Desconto" },
    header: header("Desconto"),
    cell: ({ row }) => {
      const discount = numberOf(row.original.discount_percentage);

      return text(
        discount > 0 ? discount.toFixed(1).replace(".", ",") + "%" : "—",
        "w-20",
      );
    },
  },
  {
    id: "totalWithDiscount",
    accessorFn: (row) => lineTotals(row).net,
    meta: { title: "Total do lançamento" },
    header: header("Total do lançamento"),
    cell: ({ row }) =>
      text(formatToBrazilianCurrency(lineTotals(row.original).net), "w-36"),
  },
  {
    id: "serviceOrderDate",
    accessorFn: (row) => row.serviceOrder.date,
    meta: { title: "Data da ordem" },
    header: header("Data da ordem"),
    cell: ({ row }) =>
      text(formatPickedDay(row.original.serviceOrder.date), "w-32"),
  },
  {
    id: "vehicleLicensePlate",
    accessorFn: (row) => row.serviceOrder.vehicle.license_plate,
    meta: { title: "Placa do veículo" },
    header: header("Placa do veículo"),
    cell: ({ row }) =>
      text(row.original.serviceOrder.vehicle.license_plate, "w-28"),
  },
  {
    id: "vehicleDescription",
    accessorFn: (row) => row.serviceOrder.vehicle.description,
    meta: { title: "Descrição do veículo" },
    header: header("Descrição do veículo"),
    cell: ({ row }) =>
      text(row.original.serviceOrder.vehicle.description, "w-48"),
  },
  {
    // Also the facet behind "Ver Peças da Ordem" (ORDER_PART_TABLE), so the
    // column stays, hidden by default (OrderPartTable); shown, it reads as
    // the same "OS #…" as everywhere else.
    accessorKey: "serviceOrderId",
    meta: { title: "Ordem de serviço" },
    header: header("Ordem de serviço"),
    cell: ({ row }) => (
      <IdCell id={row.original.serviceOrderId} prefix="OS #" className="w-40" />
    ),
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
      <OrderPartRowActions scope={scope} line={row.original} />
    ),
    enableHiding: false,
  },
];

export { buildOrderPartColumns };
