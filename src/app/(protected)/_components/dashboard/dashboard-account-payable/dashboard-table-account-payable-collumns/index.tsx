"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";

import { accountPayableTableSchema } from "@/schemas/account-payable-table-schema";
import { DataTableColumnHeader } from "../../../tanstack-table/data-table-collumn-header";

import { DashboardDataTableAccountPayableRowActions } from "../dashboard-data-table-row-actions";
import { formatDate } from "@/lib/format-values";

const dashboardAccountPayableTableCollumns: ColumnDef<accountPayableTableSchema>[] =
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
      accessorKey: "issue_date",
      meta: {
        title: "Data da emissão",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Data da emissão" />
      ),
      cell: ({ row }) => (
        <p className="truncate font-medium w-64">
          {row.getValue("issue_date") ?? "N/A"}
        </p>
      ),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: "due_date",
      meta: {
        title: "Data de vencimento",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Data de vencimento" />
      ),
      cell: ({ row }) => {
        return (
          <p className="truncate font-medium w-64">
            {formatDate(row.getValue("due_date"), "pt-BR") ?? "N/A"}
          </p>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: "payment_date",
      meta: {
        title: "Data do pagamento",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Data do pagamento" />
      ),
      cell: ({ row }) => {
        return (
          <p className=" truncate font-medium w-24">
            {formatDate(row.getValue("payment_date"), "pt-BR") ?? "N/A"}
          </p>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "amount",
      meta: {
        title: "Valor total",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Valor" />
      ),
      cell: ({ row }) => {
        return (
          <p className="truncate font-medium w-28">
            {row.getValue("amount") ?? "N/A"}
          </p>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: "amount_paid",
      meta: {
        title: "Valor pago",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Valor pago" />
      ),
      cell: ({ row }) => {
        return (
          <p className="truncate font-medium w-28">
            {row.getValue("amount_paid") ?? "N/A"}
          </p>
        );
      },
    },
    {
      accessorKey: "remainingAmount",
      meta: {
        title: "Valor restante",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Valor restante" />
      ),
      cell: ({ row }) => {
        return (
          <p className="truncate font-medium w-32">
            {row.getValue("remainingAmount") ?? "N/A"}
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
        <DataTableColumnHeader
          column={column}
          title="Identificador da empresa"
        />
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
      accessorKey: "registrationUserId",
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
          <p className="truncate font-medium w-44">
            {row.getValue("registrationUserId") ?? "N/A"}
          </p>
        );
      },
    },
    {
      accessorKey: "registrationUserName",
      meta: {
        title: "Registro nome do usuário",
      },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Registro nome do usuário"
        />
      ),
      cell: ({ row }) => {
        return (
          <p className="truncate font-medium w-44">
            {row.getValue("registrationUserName") ?? "N/A"}
          </p>
        );
      },
    },
    {
      accessorKey: "status",
      meta: {
        title: "Status",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        return (
          <p className="truncate font-medium w-44">
            {row.getValue("status") ?? "N/A"}
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
        <DashboardDataTableAccountPayableRowActions row={row} />
      ),
    },
  ];

export { dashboardAccountPayableTableCollumns };
