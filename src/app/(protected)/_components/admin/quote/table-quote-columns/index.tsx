"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";

import { Badge } from "@/components/ui/badge";

import { DataTableColumnHeader } from "../../../tanstack-table/data-table-collumn-header";
import { DataTableQuoteRowActions } from "../data-table-row-actions";

import {
  displayValue,
  formatNotificationDate,
  formatTelephone,
} from "@/lib/format-values";
import { QuoteProps } from "../dto";

const statusColors = {
  PENDING: "bg-yellow-500/10 text-yellow-600",
  CONTACTED: "bg-blue-500/10 text-blue-600",
  CLOSED: "bg-gray-500/10 text-gray-600",
  CONVERTED: "bg-green-500/10 text-green-600",
};

const statusLabels = {
  PENDING: "Pendente",
  CONTACTED: "Contatado",
  CLOSED: "Fechado",
  CONVERTED: "Convertido",
};

const tableQuoteColumns: ColumnDef<QuoteProps>[] = [
  {
    id: "select",
    meta: {
      title: "Seleção",
    },
    header: ({ table }) => (
      <Checkbox
        id="select-all-quotes"
        name="select-all-quotes"
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
        id={`select-quote-${row.id}`}
        name={`select-quote-${row.id}`}
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
      title: "Status",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as keyof typeof statusLabels;
      return (
        <Badge variant="outline" className={statusColors[status]}>
          {statusLabels[status]}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "name",
    meta: {
      title: "Nome",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-44">
        {displayValue(row.getValue("name"))}
      </p>
    ),
  },
  {
    accessorKey: "company",
    meta: {
      title: "Empresa",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Empresa" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-44">
        {displayValue(row.getValue("company"))}
      </p>
    ),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "email",
    meta: {
      title: "E-mail",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="E-mail" />
    ),
    cell: ({ row }) => (
      <p className="truncate font-medium w-52">
        {displayValue(row.getValue("email"))}
      </p>
    ),
  },
  {
    accessorKey: "telephone",
    meta: {
      title: "Telefone",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Telefone" />
    ),
    cell: ({ row }) => (
      <p className="font-medium w-36">
        {displayValue(formatTelephone(row.getValue("telephone")))}
      </p>
    ),
  },
  {
    accessorKey: "fleet_size",
    meta: {
      title: "Tamanho da Frota",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tamanho da Frota" />
    ),
    cell: ({ row }) => {
      const fleetSize = row.getValue("fleet_size") as string;
      const fleetLabels: Record<string, string> = {
        "1-5": "1 a 5 veículos",
        "6-15": "6 a 15 veículos",
        "16-30": "16 a 30 veículos",
        "31-50": "31 a 50 veículos",
        "51-100": "51 a 100 veículos",
        "101+": "Mais de 100 veículos",
      };
      return (
        <p className="font-medium">
          {displayValue(fleetLabels[fleetSize] || fleetSize)}
        </p>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "contacted_at",
    meta: {
      title: "Data de Contato",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Data de Contato" />
    ),
    cell: ({ row }) => {
      return (
        <p className="font-medium w-40">
          {displayValue(
            formatNotificationDate(row.getValue("contacted_at"), "pt-BR"),
          )}
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
    cell: ({ row }) => <DataTableQuoteRowActions row={row} />,
  },
];

export { tableQuoteColumns };
