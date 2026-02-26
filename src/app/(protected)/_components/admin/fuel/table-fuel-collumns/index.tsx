"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";

import { Badge } from "@/components/ui/badge";

import { fuelTableSchema } from "@/schemas/fuel-table-schema";
import { DataTableColumnHeader } from "../../../tanstack-table/data-table-collumn-header";

import { DataTableFuelRowActions } from "../data-table-row-actions";
import {
  formatDate,
  formatNotificationDate,
  formatToBrazilianCurrency,
  displayValue,
} from "@/lib/format-values";

// Labels and colors for odometer verification badges
const odometerLabels = {
  true: "Verificado",
  false: "Não verificado",
} as const;

const odometerColors = {
  true: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
  false: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200",
} as const;

const tableFuelColumns: ColumnDef<fuelTableSchema>[] = [
  {
    id: "select",
    meta: {
      title: "Seleção",
    },
    header: ({ table }) => (
      <Checkbox
        id="select-all-fuels"
        name="select-all-fuels"
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        id={`select-fuel-${row.id}`}
        name={`select-fuel-${row.id}`}
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "id",
    meta: {
      title: "Identificador",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Identificador" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-72">
        {displayValue(row.getValue("id"))}
      </p>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "refueling_date",
    meta: {
      title: "Data do abastecimento",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Data do abastecimento" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-44">
          {displayValue(formatDate(row.getValue("refueling_date"), "pt-BR"))}
        </p>
      );
    },
  },
  {
    accessorKey: "current_mileage",
    meta: {
      title: "Quilometragem",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Quilometragem" />
    ),
    cell: ({ row }) => {
      const mileage = row.getValue("current_mileage") as number;
      return (
        <p className="truncate font-medium w-28">
          {mileage ? `${mileage.toLocaleString()} km` : "N/A"}
        </p>
      );
    },
  },
  {
    accessorKey: "liters_amount",
    meta: {
      title: "Litros",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Litros" />
    ),
    cell: ({ row }) => {
      const liters = row.getValue("liters_amount") as number;
      return (
        <p className="truncate font-medium w-24">
          {liters ? `${Number(liters).toFixed(3).replace(".", ",")}L` : "N/A"}
        </p>
      );
    },
  },
  {
    accessorKey: "price_per_liter",
    meta: {
      title: "Preço por litro",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Preço por litro" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-32">
          {displayValue(
            formatToBrazilianCurrency(row.getValue("price_per_liter")),
          )}
        </p>
      );
    },
  },
  {
    accessorKey: "total_amount",
    meta: {
      title: "Valor total",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Valor total" />
    ),
    cell: ({ row }) => {
      return (
        <p className=" truncate font-medium w-24">
          {displayValue(
            formatToBrazilianCurrency(row.getValue("total_amount")),
          )}
        </p>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "vehicle_license_plate",
    accessorFn: (row) => row.vehicle?.license_plate,
    meta: {
      title: "Placa do veículo",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Placa do veículo" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-28">
          {displayValue(row.original.vehicle?.license_plate)}
        </p>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "vehicleId",
    meta: {
      title: "Identificador do veículo",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Identificador do veículo" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-48">
          {displayValue(row.getValue("vehicleId"))}
        </p>
      );
    },
  },
  {
    accessorKey: "vehicle_description",
    accessorFn: (row) => row.vehicle?.description,
    meta: {
      title: "Descrição do veículo",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Descrição do veículo" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-48">
          {displayValue(row.original.vehicle?.description)}
        </p>
      );
    },
  },
  {
    accessorKey: "vehicle_brand",
    accessorFn: (row) => row.vehicle?.brand,
    meta: {
      title: "Marca do veículo",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Marca do veículo" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-32">
          {displayValue(row.original.vehicle?.brand)}
        </p>
      );
    },
  },
  {
    accessorKey: "vehicle_model",
    accessorFn: (row) => row.vehicle?.model,
    meta: {
      title: "Modelo do veículo",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Modelo do veículo" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-32">
          {displayValue(row.original.vehicle?.model)}
        </p>
      );
    },
  },
  {
    accessorKey: "driverId",
    meta: {
      title: "Identificador do motorista",
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Identificador do motorista"
      />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-48">
          {displayValue(row.getValue("driverId"))}
        </p>
      );
    },
  },
  {
    accessorKey: "driver_name",
    accessorFn: (row) => row.driver?.name,
    meta: {
      title: "Nome do motorista",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome do motorista" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-32">
          {displayValue(row.original.driver?.name)}
        </p>
      );
    },
  },
  {
    accessorKey: "driver_cnh",
    accessorFn: (row) => row.driver?.cnh,
    meta: {
      title: "CNH do motorista",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="CNH do motorista" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-32">
          {displayValue(row.original.driver?.cnh)}
        </p>
      );
    },
  },
  {
    accessorKey: "fuelTypeId",
    meta: {
      title: "Identificador do combustível",
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Identificador do combustível"
      />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-48">
          {displayValue(row.getValue("fuelTypeId"))}
        </p>
      );
    },
  },
  {
    accessorKey: "fuel_type_description",
    accessorFn: (row) => row.fuelType?.description,
    meta: {
      title: "Tipo de combustível",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tipo de combustível" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-32">
          {displayValue(row.original.fuelType?.description)}
        </p>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "businessId",
    meta: {
      title: "Identificador da empresa",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Identificador da empresa" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-48">
          {displayValue(row.getValue("businessId"))}
        </p>
      );
    },
  },
  {
    accessorKey: "businessName",
    accessorFn: (row) => row.business?.corporate_reason,
    meta: {
      title: "Nome da empresa",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome da empresa" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-48">
          {displayValue(row.original.business?.corporate_reason)}
        </p>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "branchId",
    meta: {
      title: "Identificador da filial",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Identificador da filial" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-48">
          {displayValue(row.getValue("branchId"))}
        </p>
      );
    },
  },
  {
    accessorKey: "branchName",
    accessorFn: (row) => row.branch?.corporate_reason,
    meta: {
      title: "Nome da filial",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome da filial" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-48">
          {displayValue(row.original.branch?.corporate_reason)}
        </p>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "notes",
    meta: {
      title: "Observações",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Observações" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-48">
          {displayValue(row.getValue("notes"))}
        </p>
      );
    },
  },
  {
    accessorKey: "latitude",
    meta: {
      title: "Latitude",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Latitude" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-32">
          {displayValue(row.getValue("latitude"))}
        </p>
      );
    },
  },
  {
    accessorKey: "longitude",
    meta: {
      title: "Longitude",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Longitude" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-32">
          {displayValue(row.getValue("longitude"))}
        </p>
      );
    },
  },
  {
    accessorKey: "odometer_verified",
    meta: {
      title: "Odômetro verificado",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Odômetro verificado" />
    ),
    cell: ({ row }) => {
      const verified = row.getValue("odometer_verified") as boolean;
      return (
        <Badge
          variant="outline"
          className={
            odometerColors[String(verified) as keyof typeof odometerColors]
          }
        >
          {odometerLabels[String(verified) as keyof typeof odometerLabels]}
        </Badge>
      );
    },
  },
  {
    accessorKey: "created_at",
    meta: {
      title: "Criação",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Data de criação" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-36">
        {displayValue(
          formatNotificationDate(row.getValue("created_at"), "pt-BR"),
        )}
      </p>
    ),
  },
  {
    accessorKey: "updated_at",
    meta: {
      title: "Atualização",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Data de atualização" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-36">
        {displayValue(
          formatNotificationDate(row.getValue("updated_at"), "pt-BR"),
        )}
      </p>
    ),
  },
  {
    id: "Ações",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ações" />
    ),
    cell: ({ row }) => <DataTableFuelRowActions row={row} />,
  },
];

export { tableFuelColumns };
