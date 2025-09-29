"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";

import { Badge } from "@/components/ui/badge";

import { vehicleChecklistTableSchema } from "@/schemas/vehicle-checklist-table-schema";
import { DataTableColumnHeader } from "../../../tanstack-table/data-table-collumn-header";

import { DataTableVehicleChecklistRowActions } from "../dashboard-data-table-row-actions";
import { formatDate } from "@/lib/format-values";

// Helper function to format condition values
const formatCondition = (condition: string): string => {
  const conditionMap = {
    approved: "Aprovado",
    approved_with_restrictions: "Aprovado com Restrições",
    rejected: "Rejeitado",
    good: "Boa",
    fair: "Regular",
    poor: "Ruim",
    bad: "Ruim",
    needs_attention: "Precisa de Atenção",
  };
  return (
    conditionMap[condition as keyof typeof conditionMap] ?? condition ?? "N/A"
  );
};

// Labels and colors for overall condition badges
const overallConditionLabels = {
  approved: "Aprovado",
  approved_with_restrictions: "Aprovado c/ Restrições",
  rejected: "Rejeitado",
} as const;

const overallConditionColors = {
  approved: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
  approved_with_restrictions:
    "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200",
  rejected: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200",
} as const;

const dashboardTableVehicleChecklistColumns: ColumnDef<vehicleChecklistTableSchema>[] =
  [
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
        <p className="truncate font-medium w-72">
          {row.getValue("id") ?? "N/A"}
        </p>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "checklist_date",
      meta: {
        title: "Data do checklist",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Data do checklist" />
      ),
      cell: ({ row }) => {
        return (
          <p className="truncate font-medium w-44">
            {formatDate(row.getValue("checklist_date"), "pt-BR") ?? "N/A"}
          </p>
        );
      },
    },
    {
      accessorKey: "overall_condition",
      meta: {
        title: "Condição geral",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Condição geral" />
      ),
      cell: ({ row }) => {
        const condition = row.getValue(
          "overall_condition",
        ) as keyof typeof overallConditionLabels;
        return (
          <Badge
            variant="outline"
            className={overallConditionColors[condition]}
          >
            {overallConditionLabels[condition] || condition || "N/A"}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
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
        <DataTableColumnHeader
          column={column}
          title="Identificador do veículo"
        />
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
      accessorKey: "branchId",
      meta: {
        title: "Identificador da filial",
      },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Identificador da filial"
        />
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
      accessorKey: "tires_condition",
      meta: {
        title: "Condição dos pneus",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Condição dos pneus" />
      ),
      cell: ({ row }) => {
        const condition = row.getValue("tires_condition") as string;
        return (
          <p className="truncate font-medium w-32">
            {formatCondition(condition)}
          </p>
        );
      },
    },
    {
      accessorKey: "brakes_working",
      meta: {
        title: "Freios funcionando",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Freios funcionando" />
      ),
      cell: ({ row }) => {
        const working = row.getValue("brakes_working") as boolean;
        return (
          <p className="truncate font-medium w-32">{working ? "Sim" : "Não"}</p>
        );
      },
    },
    {
      accessorKey: "headlights_working",
      meta: {
        title: "Faróis funcionando",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Faróis funcionando" />
      ),
      cell: ({ row }) => {
        const working = row.getValue("headlights_working") as boolean;
        return (
          <p className="truncate font-medium w-32">{working ? "Sim" : "Não"}</p>
        );
      },
    },
    {
      accessorKey: "battery_condition",
      meta: {
        title: "Condição da bateria",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Condição da bateria" />
      ),
      cell: ({ row }) => {
        const condition = row.getValue("battery_condition") as string;
        return (
          <p className="truncate font-medium w-32">
            {formatCondition(condition)}
          </p>
        );
      },
    },
    {
      accessorKey: "spare_tire_condition",
      meta: {
        title: "Condição do estepe",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Condição do estepe" />
      ),
      cell: ({ row }) => {
        const condition = row.getValue("spare_tire_condition") as string;
        return (
          <p className="truncate font-medium w-32">
            {formatCondition(condition)}
          </p>
        );
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
      cell: ({ row }) => <DataTableVehicleChecklistRowActions row={row} />,
    },
  ];

export { dashboardTableVehicleChecklistColumns };
