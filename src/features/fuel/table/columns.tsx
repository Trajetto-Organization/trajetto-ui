"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

import { DataTableColumnHeader } from "@/app/(protected)/_components/shared/tanstack-table/data-table-collumn-header";
import type { FuelProps } from "@/app/(protected)/_components/shared/common.types";

import { getRecordOriginMeta } from "@/lib/record-origin";
import {
  displayValue,
  formatNotificationDate,
  formatToBrazilianCurrency,
} from "@/lib/format-values";
import { useAIVerificationStore } from "@/store/ai-verification-store";

import { formatPickedDay } from "@/features/vehicle/lib/picked-day";

import { fuelAIStatusBadge } from "../lib/ai-status";
import { formatPricePerLiter } from "../lib/price";
import { FuelRowActions } from "./row-actions";

/**
 * The AI verdict of the odometer, live while an analysis runs; the badge's
 * text and colour come from fuelAIStatusBadge (tested).
 */
const FuelAIStatusCell = ({ fuel }: { fuel: FuelProps }): JSX.Element => {
  const realtimeEvent = useAIVerificationStore((store) =>
    store.verifications.get(fuel.id),
  );

  const badge = fuelAIStatusBadge(fuel, realtimeEvent);

  return (
    <Badge variant="outline" className={badge.className} title={badge.title}>
      {badge.label}
    </Badge>
  );
};

const header =
  (title: string): ColumnDef<FuelProps>["header"] =>
  // eslint-disable-next-line react/display-name
  ({ column }) => <DataTableColumnHeader column={column} title={title} />;

const cellText = (
  value: string | number | null | undefined,
  width: string,
): JSX.Element => (
  <p className={`truncate font-medium ${width}`}>{displayValue(value)}</p>
);

/**
 * The refuelings table, one set of columns for /admin and /dashboard.
 *
 * Every column id is the API's sort key or facet column (server-table.ts),
 * so ordering and filtering are asked of the server; the DataTable decides
 * `enableSorting` from the spec. The company columns of the admin copy are
 * gone: /admin now shows one company at a time (the one selected at the top).
 */
function buildFuelColumns(): ColumnDef<FuelProps>[] {
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
          aria-label="Selecionar todos"
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
      accessorKey: "id",
      meta: { title: "Identificador" },
      header: header("Identificador"),
      cell: ({ row }) => cellText(row.original.id, "w-80"),
      enableHiding: false,
    },
    {
      accessorKey: "refueling_date",
      meta: { title: "Data do abastecimento" },
      header: header("Data do abastecimento"),
      // A picked day: a "YYYY-MM-DD" from an API client (00:00 UTC) reads as
      // that day, not the one before in the browser's zone.
      cell: ({ row }) =>
        cellText(formatPickedDay(row.original.refueling_date), "w-44"),
    },
    {
      id: "created_from",
      accessorFn: (row) =>
        (row as FuelProps & { created_from?: string }).created_from,
      meta: { title: "Origem" },
      header: header("Origem"),
      cell: ({ row }) => {
        const origin = getRecordOriginMeta(
          (row.original as FuelProps & { created_from?: string }).created_from,
        );

        return (
          <Badge variant="outline" className={origin.className}>
            {origin.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "current_mileage",
      meta: { title: "Quilometragem" },
      header: header("Quilometragem"),
      cell: ({ row }) => {
        const mileage = row.original.current_mileage;

        return cellText(
          mileage ? `${mileage.toLocaleString("pt-BR")} km` : null,
          "w-28",
        );
      },
    },
    {
      accessorKey: "liters_amount",
      meta: { title: "Litros" },
      header: header("Litros"),
      cell: ({ row }) => {
        const liters = row.original.liters_amount;

        return cellText(
          liters ? `${Number(liters).toFixed(3).replace(".", ",")} L` : null,
          "w-24",
        );
      },
    },
    {
      accessorKey: "price_per_liter",
      meta: { title: "Preço por litro" },
      header: header("Preço por litro"),
      // Up to three decimals, as the pump and the app record it.
      cell: ({ row }) =>
        cellText(formatPricePerLiter(row.original.price_per_liter), "w-32"),
    },
    {
      accessorKey: "total_amount",
      meta: { title: "Valor total" },
      header: header("Valor total"),
      cell: ({ row }) =>
        cellText(formatToBrazilianCurrency(row.original.total_amount), "w-28"),
      enableHiding: false,
    },
    {
      id: "vehicle_license_plate",
      accessorFn: (row) => row.vehicle?.license_plate,
      meta: { title: "Placa do veículo" },
      header: header("Placa do veículo"),
      cell: ({ row }) => cellText(row.original.vehicle?.license_plate, "w-28"),
    },
    {
      accessorKey: "vehicleId",
      meta: { title: "Identificador do veículo" },
      header: header("Identificador do veículo"),
      cell: ({ row }) => cellText(row.original.vehicleId, "w-48"),
    },
    {
      id: "vehicle_description",
      accessorFn: (row) => row.vehicle?.description,
      meta: { title: "Descrição do veículo" },
      header: header("Descrição do veículo"),
      cell: ({ row }) => cellText(row.original.vehicle?.description, "w-48"),
    },
    {
      id: "vehicle_brand",
      accessorFn: (row) => row.vehicle?.brand,
      meta: { title: "Marca do veículo" },
      header: header("Marca do veículo"),
      cell: ({ row }) => cellText(row.original.vehicle?.brand, "w-32"),
    },
    {
      id: "vehicle_model",
      accessorFn: (row) => row.vehicle?.model,
      meta: { title: "Modelo do veículo" },
      header: header("Modelo do veículo"),
      cell: ({ row }) => cellText(row.original.vehicle?.model, "w-32"),
    },
    {
      accessorKey: "driverId",
      meta: { title: "Identificador do motorista" },
      header: header("Identificador do motorista"),
      cell: ({ row }) => cellText(row.original.driverId, "w-48"),
    },
    {
      id: "driver_name",
      accessorFn: (row) => row.driver?.name,
      meta: { title: "Nome do motorista" },
      header: header("Nome do motorista"),
      cell: ({ row }) => cellText(row.original.driver?.name, "w-40"),
    },
    {
      id: "driver_cnh",
      accessorFn: (row) => row.driver?.cnh,
      meta: { title: "CNH do motorista" },
      header: header("CNH do motorista"),
      cell: ({ row }) => cellText(row.original.driver?.cnh, "w-32"),
    },
    {
      accessorKey: "fuelTypeId",
      meta: { title: "Identificador do combustível" },
      header: header("Identificador do combustível"),
      cell: ({ row }) => cellText(row.original.fuelTypeId, "w-48"),
    },
    {
      id: "fuel_type_description",
      accessorFn: (row) => row.fuelType?.description,
      meta: { title: "Tipo de combustível" },
      header: header("Tipo de combustível"),
      cell: ({ row }) => cellText(row.original.fuelType?.description, "w-32"),
    },
    {
      accessorKey: "branchId",
      meta: { title: "Identificador da filial" },
      header: header("Identificador da filial"),
      cell: ({ row }) => cellText(row.original.branchId, "w-48"),
    },
    {
      id: "branchName",
      accessorFn: (row) => row.branch?.corporate_reason,
      meta: { title: "Nome da filial" },
      header: header("Nome da filial"),
      cell: ({ row }) =>
        cellText(row.original.branch?.corporate_reason, "w-48"),
    },
    {
      accessorKey: "notes",
      meta: { title: "Observações" },
      header: header("Observações"),
      cell: ({ row }) => cellText(row.original.notes, "w-48"),
    },
    {
      accessorKey: "latitude",
      meta: { title: "Latitude" },
      header: header("Latitude"),
      cell: ({ row }) => cellText(row.original.latitude, "w-32"),
    },
    {
      accessorKey: "longitude",
      meta: { title: "Longitude" },
      header: header("Longitude"),
      cell: ({ row }) => cellText(row.original.longitude, "w-32"),
    },
    {
      accessorKey: "odometer_ai_status",
      meta: { title: "Verificação IA" },
      header: header("Verificação IA"),
      cell: ({ row }) => <FuelAIStatusCell fuel={row.original} />,
    },
    {
      accessorKey: "created_at",
      meta: { title: "Criação" },
      header: header("Data de criação"),
      cell: ({ row }) =>
        cellText(
          formatNotificationDate(row.original.created_at, "pt-BR"),
          "w-36",
        ),
    },
    {
      accessorKey: "updated_at",
      meta: { title: "Atualização" },
      header: header("Data de atualização"),
      cell: ({ row }) =>
        cellText(
          formatNotificationDate(row.original.updated_at, "pt-BR"),
          "w-36",
        ),
    },
    {
      id: "Ações",
      header: header("Ações"),
      cell: ({ row }) => <FuelRowActions row={row} />,
      enableHiding: false,
    },
  ];
}

export { buildFuelColumns };
