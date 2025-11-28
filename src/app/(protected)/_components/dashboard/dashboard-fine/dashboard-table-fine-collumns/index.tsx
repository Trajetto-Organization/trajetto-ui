"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";

import { fineTableSchema } from "@/schemas/fine-table-schema";
import { DataTableColumnHeader } from "../../../tanstack-table/data-table-collumn-header";

import { formatDate } from "@/lib/format-values";
import { DashboardDataTableFineRowActions } from "../dashboard-data-table-row-actions";

const dashboardTableFineColumns: ColumnDef<fineTableSchema>[] = [
  {
    id: "select",
    meta: {
      title: "Seleção",
    },
    header: ({ table }) => (
      <Checkbox
        id="select-all-dashboard-fines"
        name="select-all-dashboard-fines"
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
        id={`select-dashboard-fine-${row.id}`}
        name={`select-dashboard-fine-${row.id}`}
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
    accessorKey: "violation_date",
    meta: {
      title: "Data da infração",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Data da infração" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-32">
        {formatDate(row.getValue("violation_date"), "pt-BR") ?? "N/A"}
      </p>
    ),
  },
  {
    accessorKey: "due_date",
    meta: {
      title: "Data de vencimento",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Data de vencimento" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-32">
        {formatDate(row.getValue("due_date"), "pt-BR") ?? "N/A"}
      </p>
    ),
  },
  {
    accessorKey: "payment_date",
    meta: {
      title: "Data de pagamento",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Data de pagamento" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-32">
        {row.getValue("payment_date")
          ? formatDate(row.getValue("payment_date"), "pt-BR")
          : "N/A"}
      </p>
    ),
  },
  {
    accessorKey: "amount",
    meta: {
      title: "Valor da multa",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Valor da multa" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-24">
        {row.getValue("amount") ?? "N/A"}
      </p>
    ),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    enableSorting: false,
  },
  {
    accessorKey: "points",
    meta: {
      title: "Pontos",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Pontos" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-16">
        {row.getValue("points") ?? "0"}
      </p>
    ),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "location",
    meta: {
      title: "Local da infração",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Local da infração" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-48">
        {row.getValue("location") ?? "N/A"}
      </p>
    ),
  },
  {
    accessorKey: "violationCode",
    meta: {
      title: "Código da infração",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Código da infração" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-24">
        {row.getValue("violationCode") ?? "N/A"}
      </p>
    ),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "violationDescription",
    meta: {
      title: "Descrição da infração",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Descrição da infração" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-64">
        {row.getValue("violationDescription") ?? "N/A"}
      </p>
    ),
  },
  {
    accessorKey: "driverName",
    meta: {
      title: "Nome do motorista",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome do motorista" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-48">
        {row.getValue("driverName") ?? "N/A"}
      </p>
    ),
  },
  {
    accessorKey: "driverCpf",
    meta: {
      title: "CPF do motorista",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="CPF do motorista" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-32">
        {row.getValue("driverCpf") ?? "N/A"}
      </p>
    ),
  },
  {
    accessorKey: "vehicleLicensePlate",
    meta: {
      title: "Placa do veículo",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Placa do veículo" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-24">
        {row.getValue("vehicleLicensePlate") ?? "N/A"}
      </p>
    ),
  },
  {
    accessorKey: "vehicleDescription",
    meta: {
      title: "Descrição do veículo",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Descrição do veículo" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-48">
        {row.getValue("vehicleDescription") ?? "N/A"}
      </p>
    ),
  },
  {
    accessorKey: "branchName",
    meta: {
      title: "Nome da filial",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome da filial" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-48">
        {row.getValue("branchName") ?? "N/A"}
      </p>
    ),
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
          {row.getValue("latitude") ?? "N/A"}
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
          {row.getValue("longitude") ?? "N/A"}
        </p>
      );
    },
  },
  {
    accessorKey: "observation",
    meta: {
      title: "Observações",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Observações" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-64">
        {row.getValue("observation") ?? "N/A"}
      </p>
    ),
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
    cell: ({ row }) => <DashboardDataTableFineRowActions row={row} />,
  },
];

export { dashboardTableFineColumns };
