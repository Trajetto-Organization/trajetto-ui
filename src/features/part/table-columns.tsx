"use client";

import type { ColumnDef, HeaderContext } from "@tanstack/react-table";

import { DataTableColumnHeader } from "@/app/(protected)/_components/shared/tanstack-table/data-table-collumn-header";

import {
  displayValue,
  formatNotificationDate,
  formatToBrazilianCurrency,
} from "@/lib/format-values";

import type { FleetScope } from "@/features/service-order/lib/service-order-rules";

import type { PartRow } from "./lib/part-rules";
import { PartRowActions } from "./row-actions";

function header(title: string) {
  const Header = ({ column }: HeaderContext<PartRow, unknown>) => (
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

/** The parts catalog table; sortable/filterable ids are the API's keys (PART_TABLE). */
const buildPartColumns = (scope: FleetScope): ColumnDef<PartRow>[] => [
  // The description is the part's identifier in the catalog (it has no SKU).
  {
    accessorKey: "description",
    meta: { title: "Descrição" },
    header: header("Descrição"),
    cell: ({ row }) => text(row.original.description, "w-56"),
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
    id: "supplierName",
    accessorFn: (row) => row.supplier?.name,
    meta: { title: "Fornecedor" },
    header: header("Fornecedor"),
    cell: ({ row }) =>
      text(row.original.supplier?.name ?? "Sem fornecedor", "w-48"),
  },
  {
    id: "service_order_parts_count",
    accessorFn: (row) => row.service_order_parts_count ?? 0,
    meta: { title: "Uso em ordens" },
    header: header("Uso em ordens"),
    cell: ({ row }) =>
      text(String(row.original.service_order_parts_count ?? 0), "w-24"),
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
    cell: ({ row }) => <PartRowActions scope={scope} part={row.original} />,
    enableHiding: false,
  },
];

export { buildPartColumns };
