"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";

import { vehicleTableSchema } from "@/schemas/vehicle-table-schema";
import { DataTableColumnHeader } from "../../../tanstack-table/data-table-collumn-header";

import { DashboardDataTableVehicleRowActions } from "../dashboard-data-table-row-actions";
import { formatDate } from "@/lib/format-values";

const dashboardTableVehicleCollumns: ColumnDef<vehicleTableSchema>[] = [
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
    accessorKey: "description",
    meta: {
      title: "Nome do veículo",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome do veículo" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-44">
          {row.getValue("description") ?? "N/A"}
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
          {row.getValue("license_plate") ?? "N/A"}
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
          {row.getValue("brand") ?? "N/A"}
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
          {row.getValue("model") ?? "N/A"}
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
          {formatDate(row.getValue("acquisition_date"), "pt-BR") ?? "N/A"}
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
      return (
        <p className="truncate font-medium w-24">
          {row.getValue("fleet_type") === "OWNED" ? "Própria" : "Terceirizada"}
        </p>
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
          {formatDate(row.getValue("last_maintenance_date"), "pt-BR") ?? "N/A"}
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
      return (
        <p className="truncate font-medium w-24">
          {value != null ? `${value} km` : "N/A"}
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
      return (
        <p className="truncate font-medium w-24">
          {value != null ? `${value} km` : "N/A"}
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
      return (
        <p className="truncate font-medium w-24">
          {value != null ? `${value} km` : "N/A"}
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
      return (
        <p className="truncate font-medium w-24">
          {value != null ? `${value} meses` : "N/A"}
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
          {row.getValue("renavam") ?? "N/A"}
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
          {formatDate(row.getValue("manufacturing_year"), "pt-BR") ?? "N/A"}
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
          {formatDate(row.getValue("model_year"), "pt-BR") ?? "N/A"}
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
      return (
        <p className="truncate font-medium w-24">
          {value != null ? `${value} km por litro` : "N/A"}
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
          {row.getValue("number_of_axles") ?? "N/A"}
        </p>
      );
    },
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
      const status = row.getValue("status");

      const statusMap: Record<string, string> = {
        ACTIVE: "Ativo",
        INACTIVE: "Inativo",
        BLOCKED: "Bloqueado",
        IN_ROUTE: "Em rota",
      };

      const translatedStatus: string = status
        ? statusMap[status as keyof typeof statusMap] || String(status)
        : "N/A";

      return <p className="truncate font-medium w-24">{translatedStatus}</p>;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
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
          {row.getValue("vehicleTypeId") ?? "N/A"}
        </p>
      );
    },
  },
  {
    accessorKey: "vehicleTypeDescription",
    meta: {
      title: "Nome do tipo de veículo",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome do tipo de veículo" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-48">
          {row.getValue("vehicleTypeDescription") ?? "N/A"}
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
          {row.getValue("fuelTypeId") ?? "N/A"}
        </p>
      );
    },
  },
  {
    accessorKey: "fuelTypeDescription",
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
      return (
        <p className="truncate font-medium w-48">
          {row.getValue("fuelTypeDescription") ?? "N/A"}
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
    accessorKey: "driverName",
    meta: {
      title: "Nome do motorista",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome do motorista" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-48">
          {row.getValue("driverName") ?? "N/A"}
        </p>
      );
    },
  },
  {
    accessorKey: "driverCnh",
    meta: {
      title: "CNH do motorista",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="CNH do motorista" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-48">
          {row.getValue("driverCnh") ?? "N/A"}
        </p>
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
          {row.getValue("branchId") ?? "N/A"}
        </p>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "branchName",
    meta: {
      title: "Nome da filial",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome da filial" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-48">
          {row.getValue("branchName") ?? "N/A"}
        </p>
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
    cell: ({ row }) => <DashboardDataTableVehicleRowActions row={row} />,
  },
];

export { dashboardTableVehicleCollumns };
