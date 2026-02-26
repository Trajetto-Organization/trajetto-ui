"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";

import { Badge } from "@/components/ui/badge";

import { accountPayableTableSchema } from "@/schemas/account-payable-table-schema";
import { DataTableColumnHeader } from "../../../tanstack-table/data-table-collumn-header";

import { DataTableAccountPayableRowActions } from "../data-table-row-actions";
import {
  formatDate,
  formatNotificationDate,
  formatToBrazilianCurrency,
  displayValue,
} from "@/lib/format-values";

// Helper function to calculate account payable status
type AccountPayableStatus =
  | "PENDING"
  | "PAID"
  | "PARTIAL"
  | "LATE"
  | "PARTIAL_LATE"
  | "OVERDUE";

function calculateAccountPayableStatus(
  amount: number,
  amountPaid: number | null,
  dueDate: Date | string,
  paymentDate: Date | string | null,
): AccountPayableStatus {
  let status: AccountPayableStatus = "PENDING";

  const currentDate = new Date();
  const dueDateObj = new Date(dueDate);

  const isOverdue = currentDate > dueDateObj;

  if (paymentDate) {
    const paid = amountPaid || 0;
    const paymentDateObj = new Date(paymentDate);
    const isPaidLate = paymentDateObj > dueDateObj;

    if (paid >= amount) {
      // Full payment
      status = isPaidLate ? "LATE" : "PAID";
    } else if (paid > 0) {
      // Partial payment
      if (isPaidLate) {
        status = "PARTIAL_LATE";
      } else if (isOverdue) {
        status = "PARTIAL_LATE";
      } else {
        status = "PARTIAL";
      }
    }
  } else {
    // No payment date
    status = isOverdue ? "OVERDUE" : "PENDING";
  }

  return status;
}

function translateAccountPayableStatus(status: AccountPayableStatus): string {
  const translations: Record<AccountPayableStatus, string> = {
    PENDING: "Pendente",
    PAID: "Pago",
    PARTIAL: "Parcial",
    LATE: "Pago com atraso",
    PARTIAL_LATE: "Parcial com atraso",
    OVERDUE: "Vencido",
  };

  return translations[status];
}

// Labels and colors for account payable status badges
const statusLabels = {
  "Parcial com atraso": "Parcial c/ Atraso",
  Vencido: "Vencido",
  "Pago com atraso": "Pago c/ Atraso",
  Pago: "Pago",
  Pendente: "Pendente",
  Parcial: "Parcial",
} as const;

const statusColors = {
  "Parcial com atraso":
    "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200",
  Vencido: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200",
  "Pago com atraso":
    "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200",
  Pago: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
  Pendente: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200",
  Parcial:
    "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200",
} as const;

const accountPayableTableCollumns: ColumnDef<accountPayableTableSchema>[] = [
  {
    id: "select",
    meta: {
      title: "Seleção",
    },
    header: ({ table }) => (
      <Checkbox
        id="select-all-account-payables"
        name="select-all-account-payables"
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
        id={`select-account-payable-${row.id}`}
        name={`select-account-payable-${row.id}`}
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
    accessorFn: (row) => {
      const rawStatus = calculateAccountPayableStatus(
        row.amount,
        row.amount_paid,
        row.due_date,
        row.payment_date,
      );

      return translateAccountPayableStatus(rawStatus);
    },
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
          {statusLabels[status] || status || "N/A"}
        </Badge>
      );
    },
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
      <p className="truncate font-medium w-40">
        {displayValue(formatDate(row.getValue("issue_date"), "pt-BR"))}
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
        <p className="truncate font-medium w-40">
          {displayValue(formatDate(row.getValue("due_date"), "pt-BR"))}
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
        <p className=" truncate font-medium w-36">
          {displayValue(formatDate(row.getValue("payment_date"), "pt-BR"))}
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
          {displayValue(formatToBrazilianCurrency(row.getValue("amount")))}
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
      const amountPaid = row.getValue("amount_paid") as number | null;
      return (
        <p className="truncate font-medium w-28">
          {amountPaid !== null ? formatToBrazilianCurrency(amountPaid) : "N/A"}
        </p>
      );
    },
  },
  {
    accessorKey: "remainingAmount",
    accessorFn: (row) => {
      const remaining = row.amount - (row.amount_paid || 0);
      return remaining;
    },
    meta: {
      title: "Valor restante",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Valor restante" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-32">
          {displayValue(
            formatToBrazilianCurrency(row.getValue("remainingAmount")),
          )}
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
          {displayValue(row.getValue("serviceOrderId"))}
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
          {displayValue(row.getValue("registrationUserId"))}
        </p>
      );
    },
  },
  {
    accessorKey: "registrationUserName",
    accessorFn: (row) => row.registrationUser?.name,
    meta: {
      title: "Registro nome do usuário",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Registro nome do usuário" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-44">
          {displayValue(row.original.registrationUser?.name)}
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
    cell: ({ row }) => <DataTableAccountPayableRowActions row={row} />,
  },
];

export { accountPayableTableCollumns };
