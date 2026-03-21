"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";

import { serviceOrderTableSchema } from "@/schemas/service-order-table-schema";
import { DataTableColumnHeader } from "@/app/(protected)/_components/shared/tanstack-table/data-table-collumn-header";

import {
  displayValue,
  formatDate,
  formatNotificationDate,
  formatToBrazilianCurrency,
} from "@/lib/format-values";
import { DataTableServiceOrderRowActions } from "../data-table-row-actions";

const tableServiceOrderCollumns: ColumnDef<serviceOrderTableSchema>[] = [
  {
    id: "select",
    meta: {
      title: "Seleção",
    },
    header: ({ table }) => (
      <Checkbox
        id="select-all-service-orders"
        name="select-all-service-orders"
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
        id={`select-service-order-${row.id}`}
        name={`select-service-order-${row.id}`}
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
    accessorKey: "date",
    meta: {
      title: "Data da ordem de serviço",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Data da ordem de serviço" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-44">
          {displayValue(formatDate(row.getValue("date"), "pt-BR"))}
        </p>
      );
    },
  },
  {
    accessorKey: "completion_date",
    meta: {
      title: "Data de conclusão",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Data de conclusão" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-44">
          {displayValue(formatDate(row.getValue("completion_date"), "pt-BR"))}
        </p>
      );
    },
  },
  {
    accessorKey: "maintenance_type",
    meta: {
      title: "Tipo de manutenção",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tipo de manutenção" />
    ),
    cell: ({ row }) => {
      const maintenanceType = row.getValue("maintenance_type");

      let maintenanceDisplay = "N/A";

      if (maintenanceType === "INTERNAL") {
        maintenanceDisplay = "Interna";
      } else if (maintenanceType === "EXTERNAL") {
        maintenanceDisplay = "Externa";
      }

      return <p className="truncate font-medium w-36">{maintenanceDisplay}</p>;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    enableSorting: false,
    enableHiding: false,
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
        <p className="truncate font-medium w-32">
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
    accessorKey: "vehicleLicensePlate",
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
    accessorKey: "vehicleDescription",
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
    accessorKey: "partsCount",
    accessorFn: (row) => row.parts?.length,
    meta: {
      title: "Quantidade de peças",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Quantidade de peças" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-8">
          {displayValue(row.original.parts?.length)}
        </p>
      );
    },
  },
  {
    accessorKey: "responsibleUserId",
    meta: {
      title: "Identificador do responsável",
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Identificador do responsável"
      />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-32">
          {displayValue(row.getValue("responsibleUserId"))}
        </p>
      );
    },
  },
  {
    accessorKey: "responsibleUserName",
    accessorFn: (row) => row.responsibleUser?.name,
    meta: {
      title: "Nome do responsável",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome do responsável" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-32">
          {displayValue(row.original.responsibleUser?.name)}
        </p>
      );
    },
  },
  {
    accessorKey: "responsibleUserEmail",
    accessorFn: (row) => row.responsibleUser?.email,
    meta: {
      title: "E-mail do responsável",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="E-mail do responsável" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-32">
          {displayValue(row.original.responsibleUser?.email)}
        </p>
      );
    },
  },
  {
    accessorKey: "supplierId",
    meta: {
      title: "Identificador do fornecedor",
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Identificador do fornecedor"
      />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-48">
          {displayValue(row.getValue("supplierId"))}
        </p>
      );
    },
  },
  {
    accessorKey: "supplierName",
    accessorFn: (row) => row.supplier?.name,
    meta: {
      title: "Nome do fornecedor",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome do fornecedor" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-48">
          {displayValue(row.original.supplier?.name)}
        </p>
      );
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
    cell: ({ row }) => <DataTableServiceOrderRowActions row={row} />,
  },
];

export { tableServiceOrderCollumns };
