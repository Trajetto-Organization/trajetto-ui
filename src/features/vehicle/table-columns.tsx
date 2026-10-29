"use client";

import { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/app/(protected)/_components/shared/tanstack-table/data-table-collumn-header";
import { idColumn } from "@/app/(protected)/_components/shared/tanstack-table/id-cell";

import { displayValue, formatNotificationDate } from "@/lib/format-values";
import { VEHICLE_STATUS_LABELS } from "@/lib/vehicle-status";

import type { VehicleRow } from "./types";
import {
  FLEET_TYPE_LABELS,
  VEHICLE_STATUS_BADGE,
  formatKm,
  formatKmPerLiter,
  formatPickedDay,
  formatYear,
} from "./lib/presentation";
import { VehicleRowActions } from "./row-actions";

/**
 * The vehicle table for /admin and /dashboard alike. Column ids are the API's
 * sort keys and facet ids (see server-table.ts): which columns sort is decided
 * by the spec, never here, because the server orders the whole company and
 * not the page (decision 8.8).
 */
function text(value: unknown, width = "w-32"): JSX.Element {
  return (
    <p
      className={`truncate font-medium ${width}`}
      title={String(displayValue(value))}
    >
      {displayValue(value as string)}
    </p>
  );
}

/** Revision columns, shown only where revisions mean something (Gestão de Frotas). */
const MAINTENANCE_COLUMNS: ReadonlySet<string> = new Set([
  "last_maintenance_date",
  "last_maintenance_mileage",
]);

function buildVehicleColumns(
  businessId: string,
  options: { withMaintenance: boolean } = { withMaintenance: true },
): ColumnDef<VehicleRow>[] {
  const columns: ColumnDef<VehicleRow>[] = [
    idColumn<VehicleRow>(),
    {
      accessorKey: "license_plate",
      meta: { title: "Placa" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Placa" />
      ),
      cell: ({ row }) => text(row.original.license_plate, "w-24"),
      enableHiding: false,
    },
    {
      accessorKey: "description",
      meta: { title: "Veículo" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Veículo" />
      ),
      cell: ({ row }) => text(row.original.description, "w-40"),
    },
    {
      accessorKey: "status",
      meta: { title: "Status" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={VEHICLE_STATUS_BADGE[row.original.status]}
        >
          {VEHICLE_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
    {
      accessorKey: "brand",
      meta: { title: "Marca" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Marca" />
      ),
      cell: ({ row }) => text(row.original.brand, "w-24"),
    },
    {
      accessorKey: "model",
      meta: { title: "Modelo" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Modelo" />
      ),
      cell: ({ row }) => text(row.original.model, "w-28"),
    },
    {
      id: "vehicleTypeDescription",
      accessorFn: (row) => row.vehicleType?.description ?? null,
      meta: { title: "Tipo de veículo" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Tipo de veículo" />
      ),
      cell: ({ row }) => text(row.original.vehicleType?.description, "w-32"),
    },
    {
      id: "driverName",
      accessorFn: (row) => row.driver?.name ?? null,
      meta: { title: "Motorista responsável" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Motorista responsável" />
      ),
      cell: ({ row }) => text(row.original.driver?.name, "w-40"),
    },
    {
      id: "branchName",
      accessorFn: (row) => row.branch?.corporate_reason ?? null,
      meta: { title: "Filial" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Filial" />
      ),
      cell: ({ row }) => text(row.original.branch?.corporate_reason, "w-40"),
    },
    {
      accessorKey: "current_mileage",
      meta: { title: "Quilometragem atual" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Quilometragem atual" />
      ),
      cell: ({ row }) => text(formatKm(row.original.current_mileage), "w-28"),
    },
    {
      accessorKey: "km_per_liter",
      meta: { title: "Consumo" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Consumo" />
      ),
      cell: ({ row }) =>
        text(formatKmPerLiter(row.original.km_per_liter), "w-24"),
    },
    {
      accessorKey: "fleet_type",
      meta: { title: "Frota" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Frota" />
      ),
      cell: ({ row }) =>
        text(FLEET_TYPE_LABELS[row.original.fleet_type], "w-24"),
    },
    {
      accessorKey: "model_year",
      meta: { title: "Ano (fab./mod.)" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Ano (fab./mod.)" />
      ),
      cell: ({ row }) =>
        text(
          `${formatYear(row.original.manufacturing_year) ?? "—"}/${formatYear(row.original.model_year) ?? "—"}`,
          "w-24",
        ),
    },
    {
      accessorKey: "number_of_axles",
      meta: { title: "Eixos" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Eixos" />
      ),
      cell: ({ row }) => text(row.original.number_of_axles, "w-12"),
    },
    {
      accessorKey: "renavam",
      meta: { title: "RENAVAM" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="RENAVAM" />
      ),
      cell: ({ row }) => text(row.original.renavam, "w-28"),
    },
    {
      accessorKey: "last_maintenance_date",
      meta: { title: "Última revisão" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Última revisão" />
      ),
      cell: ({ row }) =>
        text(
          row.original.last_maintenance_date
            ? formatPickedDay(row.original.last_maintenance_date)
            : null,
          "w-28",
        ),
    },
    {
      accessorKey: "last_maintenance_mileage",
      meta: { title: "Km da última revisão" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Km da última revisão" />
      ),
      cell: ({ row }) =>
        text(formatKm(row.original.last_maintenance_mileage), "w-28"),
    },
    {
      accessorKey: "acquisition_date",
      meta: { title: "Aquisição" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Aquisição" />
      ),
      cell: ({ row }) =>
        text(formatPickedDay(row.original.acquisition_date), "w-24"),
    },
    {
      accessorKey: "created_at",
      meta: { title: "Cadastrado em" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Cadastrado em" />
      ),
      cell: ({ row }) =>
        text(formatNotificationDate(row.original.created_at), "w-36"),
    },
    {
      id: "actions",
      meta: { title: "Ações" },
      header: () => <span className="sr-only">Ações</span>,
      cell: ({ row }) => (
        <VehicleRowActions row={row} businessId={businessId} />
      ),
      enableHiding: false,
    },
  ];

  if (options.withMaintenance) return columns;

  return columns.filter(
    (column) =>
      !(
        "accessorKey" in column &&
        MAINTENANCE_COLUMNS.has(String(column.accessorKey))
      ),
  );
}

export { buildVehicleColumns };
