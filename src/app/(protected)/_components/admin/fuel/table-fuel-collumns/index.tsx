"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";

import { Badge } from "@/components/ui/badge";

import { fuelTableSchema } from "@/schemas/fuel-table-schema";
import { DataTableColumnHeader } from "../../../tanstack-table/data-table-collumn-header";

import { DataTableFuelRowActions } from "../data-table-row-actions";
import { formatDate } from "@/lib/format-values";

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
      <p className="truncate font-medium w-72">{row.getValue("id") ?? "N/A"}</p>
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
          {formatDate(row.getValue("refueling_date"), "pt-BR") ?? "N/A"}
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
          {row.getValue("price_per_liter") ?? "N/A"}
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
          {row.getValue("total_amount") ?? "N/A"}
        </p>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "vehicle_license_plate",
    meta: {
      title: "Placa do veículo",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Placa do veículo" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-28">
          {row.getValue("vehicle_license_plate") ?? "N/A"}
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
          {row.getValue("vehicleId") ?? "N/A"}
        </p>
      );
    },
  },
  {
    accessorKey: "vehicle_description",
    meta: {
      title: "Descrição do veículo",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Descrição do veículo" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-48">
          {row.getValue("vehicle_description") ?? "N/A"}
        </p>
      );
    },
  },
  {
    accessorKey: "vehicle_brand",
    meta: {
      title: "Marca do veículo",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Marca do veículo" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-32">
          {row.getValue("vehicle_brand") ?? "N/A"}
        </p>
      );
    },
  },
  {
    accessorKey: "vehicle_model",
    meta: {
      title: "Modelo do veículo",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Modelo do veículo" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-32">
          {row.getValue("vehicle_model") ?? "N/A"}
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
          {row.getValue("driverId") ?? "N/A"}
        </p>
      );
    },
  },
  {
    accessorKey: "driver_name",
    meta: {
      title: "Nome do motorista",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome do motorista" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-32">
          {row.getValue("driver_name") ?? "N/A"}
        </p>
      );
    },
  },
  {
    accessorKey: "driver_cnh",
    meta: {
      title: "CNH do motorista",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="CNH do motorista" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-32">
          {row.getValue("driver_cnh") ?? "N/A"}
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
          {row.getValue("fuelTypeId") ?? "N/A"}
        </p>
      );
    },
  },
  {
    accessorKey: "fuel_type_description",
    meta: {
      title: "Tipo de combustível",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tipo de combustível" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-32">
          {row.getValue("fuel_type_description") ?? "N/A"}
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
          {row.getValue("businessId") ?? "N/A"}
        </p>
      );
    },
  },
  {
    accessorKey: "business_name",
    meta: {
      title: "Nome da empresa",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome da empresa" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-48">
          {row.getValue("business_name") ?? "N/A"}
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
          {row.getValue("branchId") ?? "N/A"}
        </p>
      );
    },
  },
  {
    accessorKey: "branch_name",
    meta: {
      title: "Nome da filial",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome da filial" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-48">
          {row.getValue("branch_name") ?? "N/A"}
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
          {row.getValue("notes") ?? "N/A"}
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
      <p className="truncate font-medium w-24">
        {row.getValue("created_at") ?? "N/A"}
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
      <p className="truncate font-medium w-24">
        {row.getValue("updated_at") ?? "N/A"}
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
