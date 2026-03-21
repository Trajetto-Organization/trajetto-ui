"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";

import { Badge } from "@/components/ui/badge";

import { vehicleTableSchema } from "@/schemas/vehicle-table-schema";
import { DataTableColumnHeader } from "@/app/(protected)/_components/shared/tanstack-table/data-table-collumn-header";

import { DashboardDataTableVehicleRowActions } from "../dashboard-data-table-row-actions";
import {
  displayValue,
  formatDate,
  formatNotificationDate,
} from "@/lib/format-values";

// Labels and colors for vehicle status badges
const statusLabels = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
  BLOCKED: "Bloqueado",
  IN_ROUTE: "Em rota",
} as const;

const statusColors = {
  ACTIVE: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
  INACTIVE: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200",
  BLOCKED: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200",
  IN_ROUTE: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200",
} as const;

const dashboardTableVehicleCollumns: ColumnDef<vehicleTableSchema>[] = [
  {
    id: "select",
    meta: {
      title: "Seleção",
    },
    header: ({ table }) => (
      <Checkbox
        id="select-all-dashboard-vehicles"
        name="select-all-dashboard-vehicles"
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
        id={`select-dashboard-vehicle-${row.id}`}
        name={`select-dashboard-vehicle-${row.id}`}
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
    accessorKey: "status",
    meta: {
      title: "Status do veículo",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status do veículo" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as keyof typeof statusLabels;
      return (
        <Badge variant="outline" className={statusColors[status]}>
          {displayValue(statusLabels[status])}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "description",
    meta: {
      title: "Nome do veículo",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome do veículo" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-32">
          {displayValue(row.getValue("description"))}
        </p>
      );
    },
  },
  {
    accessorKey: "license_plate",
    meta: {
      title: "Placa do veículo",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Placa do veículo" />
    ),
    cell: ({ row }) => {
      return (
        <p className=" truncate font-medium w-24">
          {displayValue(row.getValue("license_plate"))}
        </p>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "brand",
    meta: {
      title: "Marca do veículo",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Marca do veículo" />
    ),
    cell: ({ row }) => {
      return (
        <p className=" truncate font-medium w-24">
          {displayValue(row.getValue("brand"))}
        </p>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "model",
    meta: {
      title: "Modelo do veículo",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Modelo do veículo" />
    ),
    cell: ({ row }) => {
      return (
        <p className=" truncate font-medium w-24">
          {displayValue(row.getValue("model"))}
        </p>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "acquisition_date",
    meta: {
      title: "Data de aquisição",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Data de aquisição" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-24">
          {displayValue(formatDate(row.getValue("acquisition_date"), "pt-BR"))}
        </p>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "fleet_type",
    meta: {
      title: "Tipo de frota",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tipo de frota" />
    ),
    cell: ({ row }) => {
      const fleetType =
        row.getValue("fleet_type") === "OWNED" ? "Própria" : "Terceirizada";
      return (
        <p className="truncate font-medium w-24">{displayValue(fleetType)}</p>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "last_maintenance_date",
    meta: {
      title: "Data da última revisão",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Data da última revisão" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-24">
          {displayValue(
            formatDate(row.getValue("last_maintenance_date"), "pt-BR"),
          )}
        </p>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "current_mileage",
    meta: {
      title: "Quilometragem atual",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Quilometragem atual" />
    ),
    cell: ({ row }) => {
      const value = row.getValue("current_mileage");
      const formattedValue = value != null ? `${value} km` : null;
      return (
        <p className="truncate font-medium w-24">
          {displayValue(formattedValue)}
        </p>
      );
    },
  },
  {
    accessorKey: "last_maintenance_mileage",
    meta: {
      title: "Quilometragem da última revisão",
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Quilometragem da última revisão"
      />
    ),
    cell: ({ row }) => {
      const value = row.getValue("last_maintenance_mileage");
      const formattedValue = value != null ? `${value} km` : null;

      return (
        <p className="truncate font-medium w-24">
          {displayValue(formattedValue)}
        </p>
      );
    },
  },
  {
    accessorKey: "maintenance_interval_km",
    meta: {
      title: "Período de revisão por quilometragem",
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Período de revisão por quilometragem"
      />
    ),
    cell: ({ row }) => {
      const value = row.getValue("maintenance_interval_km");
      const formattedValue = value != null ? `${value} km` : null;

      return (
        <p className="truncate font-medium w-24">
          {displayValue(formattedValue)}
        </p>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "maintenance_interval_months",
    meta: {
      title: "Período de revisão por mês",
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Período de revisão por mês"
      />
    ),
    cell: ({ row }) => {
      const value = row.getValue("maintenance_interval_months");
      const formattedValue = value != null ? `${value} meses` : null;

      return (
        <p className="truncate font-medium w-24">
          {displayValue(formattedValue)}
        </p>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "renavam",
    meta: {
      title: "Renavam",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Renavam" />
    ),
    cell: ({ row }) => {
      return (
        <p className=" truncate font-medium w-24">
          {displayValue(row.getValue("renavam"))}
        </p>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "manufacturing_year",
    meta: {
      title: "Ano de fabricação",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ano de fabricação" />
    ),
    cell: ({ row }) => {
      return (
        <p className=" truncate font-medium w-24">
          {displayValue(
            formatDate(row.getValue("manufacturing_year"), "pt-BR"),
          )}
        </p>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "model_year",
    meta: {
      title: "Ano do modelo",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ano do modelo" />
    ),
    cell: ({ row }) => {
      return (
        <p className=" truncate font-medium w-24">
          {displayValue(formatDate(row.getValue("model_year"), "pt-BR"))}
        </p>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "km_per_liter",
    meta: {
      title: "Quilômetro por litro",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Quilômetro por litro" />
    ),
    cell: ({ row }) => {
      const value = row.getValue("km_per_liter");
      const formattedValue = value != null ? `${value} km por litro` : null;

      return (
        <p className="truncate font-medium w-24">
          {displayValue(formattedValue)}
        </p>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "number_of_axles",
    meta: {
      title: "Número de eixos",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Número de eixos" />
    ),
    cell: ({ row }) => {
      return (
        <p className=" truncate font-medium w-24">
          {displayValue(row.getValue("number_of_axles"))}
        </p>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "vehicleTypeId",
    meta: {
      title: "Identificador do tipo de veículo",
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Identificador do tipo de veículo"
      />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-48">
          {displayValue(row.getValue("vehicleTypeId"))}
        </p>
      );
    },
  },
  {
    accessorKey: "vehicleTypeDescription",
    accessorFn: (row) => row.vehicleType?.description,
    meta: {
      title: "Nome do tipo de veículo",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome do tipo de veículo" />
    ),
    cell: ({ row }) => {
      const vehicleTypeDescription = row.original.vehicleType?.description;
      return (
        <p className="truncate font-medium w-48">
          {displayValue(vehicleTypeDescription)}
        </p>
      );
    },
  },
  {
    accessorKey: "fuelTypeId",
    meta: {
      title: "Identificador do tipo de combustível",
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Identificador do tipo de combustível"
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
    accessorKey: "fuelTypeDescription",
    accessorFn: (row) => row.fuelType?.description,
    meta: {
      title: "Nome do tipo de combustível",
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Nome do tipo de combustível"
      />
    ),
    cell: ({ row }) => {
      const fuelTypeDescription = row.original.fuelType?.description;
      return (
        <p className="truncate font-medium w-48">
          {displayValue(fuelTypeDescription)}
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
    accessorKey: "driverName",
    accessorFn: (row) => row.driver?.name,
    meta: {
      title: "Nome do motorista",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome do motorista" />
    ),
    cell: ({ row }) => {
      const driverName = row.original.driver?.name;
      return (
        <p className="truncate font-medium w-48">{displayValue(driverName)}</p>
      );
    },
  },
  {
    accessorKey: "driverCnh",
    accessorFn: (row) => row.driver?.cnh,
    meta: {
      title: "CNH do motorista",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="CNH do motorista" />
    ),
    cell: ({ row }) => {
      const driverCnh = row.original.driver?.cnh;
      return (
        <p className="truncate font-medium w-48">{displayValue(driverCnh)}</p>
      );
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
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
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
      const branchName = row.original.branch?.corporate_reason;
      return (
        <p className="truncate font-medium w-48">{displayValue(branchName)}</p>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
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
    cell: ({ row }) => <DashboardDataTableVehicleRowActions row={row} />,
  },
];

export { dashboardTableVehicleCollumns };
