"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";

import { serviceOrderTableSchema } from "@/schemas/service-order-table-schema";
import { DataTableColumnHeader } from "../../../tanstack-table/data-table-collumn-header";

import { formatDate } from "@/lib/format-values";
import { DashboardDataTableServiceOrderRowActions } from "../dashboard-data-table-row-actions";

const dashboardTableServiceOrderCollumns: ColumnDef<serviceOrderTableSchema>[] =
  [
    {
      id: "select",
      meta: {
        title: "Seleção",
      },
      header: ({ table }) => (
        <Checkbox
          id="select-all-dashboard-service-orders"
          name="select-all-dashboard-service-orders"
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
          id={`select-dashboard-service-order-${row.id}`}
          name={`select-dashboard-service-order-${row.id}`}
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
      accessorKey: "date",
      meta: {
        title: "Data da ordem de serviço",
      },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Data da ordem de serviço"
        />
      ),
      cell: ({ row }) => {
        return (
          <p className="truncate font-medium w-44">
            {formatDate(row.getValue("date"), "pt-BR") ?? "N/A"}
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
            {formatDate(row.getValue("completion_date"), "pt-BR") ?? "N/A"}
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

        let displayValue = "N/A";

        if (maintenanceType === "INTERNAL") {
          displayValue = "Interna";
        } else if (maintenanceType === "EXTERNAL") {
          displayValue = "Externa";
        }

        return <p className="truncate font-medium w-36">{displayValue}</p>;
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
          <p className=" truncate font-medium w-24">
            {row.getValue("total_amount") ?? "N/A"}
          </p>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "vehicleLicensePlate",
      meta: {
        title: "Placa do veículo",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Placa do veículo" />
      ),
      cell: ({ row }) => {
        return (
          <p className="truncate font-medium w-28">
            {row.getValue("vehicleLicensePlate") ?? "N/A"}
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
      accessorKey: "vehicleDescription",
      meta: {
        title: "Descrição do veículo",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Descrição do veículo" />
      ),
      cell: ({ row }) => {
        return (
          <p className="truncate font-medium w-48">
            {row.getValue("vehicleDescription") ?? "N/A"}
          </p>
        );
      },
    },
    {
      accessorKey: "partsCount",
      meta: {
        title: "Quantidade de peças",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Quantidade de peças" />
      ),
      cell: ({ row }) => {
        return (
          <p className="truncate font-medium w-8">
            {row.getValue("partsCount") ?? "N/A"}
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
            {row.getValue("responsibleUserId") ?? "N/A"}
          </p>
        );
      },
    },
    {
      accessorKey: "responsibleUserName",
      meta: {
        title: "Nome do responsável",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nome do responsável" />
      ),
      cell: ({ row }) => {
        return (
          <p className="truncate font-medium w-32">
            {row.getValue("responsibleUserName") ?? "N/A"}
          </p>
        );
      },
    },
    {
      accessorKey: "responsibleUserEmail",
      meta: {
        title: "E-mail do responsável",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="E-mail do responsável" />
      ),
      cell: ({ row }) => {
        return (
          <p className="truncate font-medium w-32">
            {row.getValue("responsibleUserEmail") ?? "N/A"}
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
            {row.getValue("supplierId") ?? "N/A"}
          </p>
        );
      },
    },
    {
      accessorKey: "supplierName",
      meta: {
        title: "Nome do fornecedor",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nome do fornecedor" />
      ),
      cell: ({ row }) => {
        return (
          <p className="truncate font-medium w-48">
            {row.getValue("supplierName") ?? "N/A"}
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
      cell: ({ row }) => <DashboardDataTableServiceOrderRowActions row={row} />,
    },
  ];

export { dashboardTableServiceOrderCollumns };
