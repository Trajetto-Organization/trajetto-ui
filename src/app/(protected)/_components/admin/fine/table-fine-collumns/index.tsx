"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";

import { fineTableSchema } from "@/schemas/fine-table-schema";
import { DataTableColumnHeader } from "../../../tanstack-table/data-table-collumn-header";

import {
  displayValue,
  formatDate,
  formatNotificationDate,
  formatToBrazilianCurrency,
  formatCpf,
} from "@/lib/format-values";
import { DataTableFineRowActions } from "../data-table-row-actions";

const tableFineCollumns: ColumnDef<fineTableSchema>[] = [
  {
    id: "select",
    meta: {
      title: "Seleção",
    },
    header: ({ table }) => (
      <Checkbox
        id="select-all-fines"
        name="select-all-fines"
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
        id={`select-fine-${row.id}`}
        name={`select-fine-${row.id}`}
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
    accessorKey: "violation_date",
    meta: {
      title: "Data da infração",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Data da infração" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-32">
        {displayValue(formatDate(row.getValue("violation_date"), "pt-BR"))}
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
        {displayValue(formatDate(row.getValue("due_date"), "pt-BR"))}
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
        {displayValue(formatDate(row.getValue("payment_date"), "pt-BR"))}
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
        {displayValue(formatToBrazilianCurrency(row.getValue("amount")))}
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
        {displayValue(row.getValue("points")?.toString())}
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
        {displayValue(row.getValue("location"))}
      </p>
    ),
  },
  {
    accessorKey: "violationCode",
    accessorFn: (row) => {
      const code = row.trafficViolationCode?.code;
      const subCode = row.trafficViolationCode?.sub_code;

      return code && subCode !== undefined && subCode !== null
        ? `${code}-${subCode}`
        : "";
    },
    meta: {
      title: "Código da infração",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Código da infração" />
    ),
    cell: ({ row }) => {
      const code = row.original.trafficViolationCode?.code;
      const subCode = row.original.trafficViolationCode?.sub_code;

      const violationCode =
        code && subCode !== undefined && subCode !== null
          ? `${code}-${subCode}`
          : undefined;

      return (
        <p className="truncate font-medium w-24">
          {displayValue(violationCode)}
        </p>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "violationDescription",
    accessorFn: (row) => row.trafficViolationCode?.description || "",
    meta: {
      title: "Descrição da infração",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Descrição da infração" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-64">
        {displayValue(row.original.trafficViolationCode?.description)}
      </p>
    ),
  },
  {
    accessorKey: "driverName",
    accessorFn: (row) => row.driver?.name || "",
    meta: {
      title: "Nome do motorista",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome do motorista" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-48">
        {displayValue(row.original.driver?.name)}
      </p>
    ),
  },
  {
    accessorKey: "driverCpf",
    accessorFn: (row) => row.driver?.cpf || "",
    meta: {
      title: "CPF do motorista",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="CPF do motorista" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-32">
        {displayValue(formatCpf(row.original.driver?.cpf))}
      </p>
    ),
  },
  {
    accessorKey: "vehicleLicensePlate",
    accessorFn: (row) => row.vehicle?.license_plate || "",
    meta: {
      title: "Placa do veículo",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Placa do veículo" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-24">
        {displayValue(row.original.vehicle?.license_plate)}
      </p>
    ),
  },
  {
    accessorKey: "vehicleDescription",
    accessorFn: (row) => row.vehicle?.description || "",
    meta: {
      title: "Descrição do veículo",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Descrição do veículo" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-48">
        {displayValue(row.original.vehicle?.description)}
      </p>
    ),
  },
  {
    accessorKey: "businessName",
    accessorFn: (row) => row.business?.corporate_reason || "",
    meta: {
      title: "Nome da empresa",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome da empresa" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-48">
        {displayValue(row.original.business?.corporate_reason)}
      </p>
    ),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "branchName",
    accessorFn: (row) => row.branch?.corporate_reason || "",
    meta: {
      title: "Nome da filial",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome da filial" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-48">
        {displayValue(row.original.branch?.corporate_reason)}
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
    accessorKey: "observation",
    meta: {
      title: "Observações",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Observações" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-64">
        {displayValue(row.getValue("observation"))}
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
    cell: ({ row }) => <DataTableFineRowActions row={row} />,
  },
];

export { tableFineCollumns };
