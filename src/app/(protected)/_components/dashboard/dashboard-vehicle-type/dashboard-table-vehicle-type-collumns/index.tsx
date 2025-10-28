"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";

import { vehicleTypeTableSchema } from "@/schemas/vehicle-type-table-schema";
import { DataTableColumnHeader } from "../../../tanstack-table/data-table-collumn-header";

import { DataTableVehicleTypeRowActions } from "../dashboard-data-table-row-actions";

const dashboardTableVehicleTypeCollumns: ColumnDef<vehicleTypeTableSchema>[] = [
  {
    id: "select",
    meta: {
      title: "Seleção",
    },
    header: ({ table }) => (
      <Checkbox
        id="select-all-dashboard-vehicle-types"
        name="select-all-dashboard-vehicle-types"
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
        id={`select-dashboard-vehicle-type-${row.id}`}
        name={`select-dashboard-vehicle-type-${row.id}`}
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
      title: "Descrição do tipo de veículo",
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Descrição do tipo de veículo"
      />
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
    accessorKey: "number_of_axles",
    meta: {
      title: "Number axles",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Quantidade de eixos" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-36">
          {row.getValue("number_of_axles") ?? "N/A"}
        </p>
      );
    },
    enableSorting: false,
    enableHiding: false,
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
    cell: ({ row }) => <DataTableVehicleTypeRowActions row={row} />,
  },
];

export { dashboardTableVehicleTypeCollumns };
