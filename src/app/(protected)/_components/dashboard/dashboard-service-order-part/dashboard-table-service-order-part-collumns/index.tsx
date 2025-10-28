"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";

import { serviceOrderPartTableSchema } from "@/schemas/service-order-part-table-schema";
import { DataTableColumnHeader } from "../../../tanstack-table/data-table-collumn-header";

import { formatDate } from "@/lib/format-values";
import { DashboardDataTableServiceOrderPartRowActions } from "../dashboard-data-table-row-actions";

const dashboardTableServiceOrderPartCollumns: ColumnDef<serviceOrderPartTableSchema>[] =
  [
    {
      id: "select",
      meta: {
        title: "Seleção",
      },
      header: ({ table }) => (
        <Checkbox
          id="select-all-dashboard-service-order-parts"
          name="select-all-dashboard-service-order-parts"
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
          id={`select-dashboard-service-order-part-${row.id}`}
          name={`select-dashboard-service-order-part-${row.id}`}
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
      accessorKey: "unit_price",
      meta: {
        title: "Preço unitário",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Preço unitário" />
      ),
      cell: ({ row }) => {
        return (
          <p className="truncate font-medium w-44">
            {row.getValue("unit_price") ?? "N/A"}
          </p>
        );
      },
    },
    {
      accessorKey: "quantity",
      meta: {
        title: "Quantidade",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Quantidade" />
      ),
      cell: ({ row }) => {
        return (
          <p className="truncate font-medium w-44">
            {row.getValue("quantity") ?? "N/A"}
          </p>
        );
      },
    },
    {
      accessorKey: "discount_percentage",
      meta: {
        title: "Porcentagem do disconto",
      },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Porcentagem do disconto"
        />
      ),
      cell: ({ row }) => {
        return (
          <p className=" truncate font-medium w-24">
            {row.getValue("discount_percentage") ?? "N/A"}
          </p>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "serviceOrderId",
      meta: {
        title: "Identificador da ordem de serviço",
      },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Identificador da ordem de serviço"
        />
      ),
      cell: ({ row }) => {
        return (
          <p className="truncate font-medium w-48">
            {row.getValue("serviceOrderId") ?? "N/A"}
          </p>
        );
      },
    },
    {
      accessorKey: "serviceOrderDescription",
      meta: {
        title: "Nome da ordem de serviço",
      },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Nome da ordem de serviço"
        />
      ),
      cell: ({ row }) => {
        return (
          <p className="truncate font-medium w-48">
            {row.getValue("serviceOrderDescription") ?? "N/A"}
          </p>
        );
      },
    },
    {
      accessorKey: "serviceOrderDate",
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
            {formatDate(row.getValue("serviceOrderDate"), "pt-BR") ?? "N/A"}
          </p>
        );
      },
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
      accessorKey: "partId",
      meta: {
        title: "Identificador da peça",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Identificador da peça" />
      ),
      cell: ({ row }) => {
        return (
          <p className="truncate font-medium w-48">
            {row.getValue("partId") ?? "N/A"}
          </p>
        );
      },
    },
    {
      accessorKey: "partDescription",
      meta: {
        title: "Descrição da peça",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Descrição da peça" />
      ),
      cell: ({ row }) => {
        return (
          <p className="truncate font-medium w-44">
            {row.getValue("partDescription") ?? "N/A"}
          </p>
        );
      },
    },
    {
      accessorKey: "partUnitPrice",
      meta: {
        title: "Preço unitário da peça",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Preço unitário da peça" />
      ),
      cell: ({ row }) => {
        return (
          <p className="truncate font-medium w-32">
            {row.getValue("partUnitPrice") ?? "N/A"}
          </p>
        );
      },
    },
    {
      accessorKey: "totalPrice",
      meta: {
        title: "Preço total",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Preço total" />
      ),
      cell: ({ row }) => {
        return (
          <p className="truncate font-medium w-32">
            {row.getValue("totalPrice") ?? "N/A"}
          </p>
        );
      },
    },
    {
      accessorKey: "totalWithDiscount",
      meta: {
        title: "Preço total com desconto",
      },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Preço total com desconto"
        />
      ),
      cell: ({ row }) => {
        return (
          <p className="truncate font-medium w-32">
            {row.getValue("totalWithDiscount") ?? "N/A"}
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
      cell: ({ row }) => (
        <DashboardDataTableServiceOrderPartRowActions row={row} />
      ),
    },
  ];

export { dashboardTableServiceOrderPartCollumns };
