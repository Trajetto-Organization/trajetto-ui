"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";

import { Badge } from "@/components/ui/badge";

import { vehicleChecklistTableSchema } from "@/schemas/vehicle-checklist-table-schema";
import { DataTableColumnHeader } from "@/app/(protected)/_components/shared/tanstack-table/data-table-collumn-header";

import { DataTableVehicleChecklistRowActions } from "../data-table-row-actions";
import {
  formatDate,
  formatNotificationDate,
  displayValue,
} from "@/lib/format-values";

import { useAIVerificationStore } from "@/store/ai-verification-store";

// AI verification status colors and labels for checklist
const checklistAIStatusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700 border-gray-200",
  analyzing: "bg-blue-100 text-blue-700 border-blue-200 animate-pulse",
  verified: "bg-green-100 text-green-800 border-green-200",
  issues_found: "bg-yellow-100 text-yellow-800 border-yellow-200",
  error: "bg-red-100 text-red-700 border-red-200",
  skipped: "bg-gray-50 text-gray-500 border-gray-100",
};

const checklistAIStatusLabels: Record<string, string> = {
  pending: "Pendente",
  analyzing: "Analisando...",
  verified: "Verificado IA",
  issues_found: "Problemas Encontrados",
  error: "Erro",
  skipped: "Não Analisado",
};

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

const ChecklistAIStatusCell = ({
  recordId,
  aiStatus,
}: {
  recordId: string;
  aiStatus: string | null;
}) => {
  const realtimeEvent = useAIVerificationStore((s) =>
    s.verifications.get(recordId),
  );

  const isTerminal =
    realtimeEvent?.step === "completed" || realtimeEvent?.step === "skipped";

  const status = realtimeEvent
    ? isTerminal
      ? realtimeEvent.overallStatus || aiStatus
      : "analyzing"
    : aiStatus;

  if (!status) {
    return (
      <Badge variant="outline" className={checklistAIStatusColors.skipped}>
        {checklistAIStatusLabels.skipped}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={
        checklistAIStatusColors[status] || checklistAIStatusColors.pending
      }
    >
      {checklistAIStatusLabels[status] || status}
    </Badge>
  );
};

const tableVehicleChecklistColumns: ColumnDef<vehicleChecklistTableSchema>[] = [
  {
    id: "select",
    meta: {
      title: "Seleção",
    },
    header: ({ table }) => (
      <Checkbox
        id="select-all-vehicle-checklists"
        name="select-all-vehicle-checklists"
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
        id={`select-vehicle-checklist-${row.id}`}
        name={`select-vehicle-checklist-${row.id}`}
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
          {displayValue(formatDate(row.getValue("checklist_date"), "pt-BR"))}
        </p>
      );
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
    accessorKey: "vehicle_description",
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
    accessorKey: "vehicle_brand",
    accessorFn: (row) => row.vehicle?.brand,
    meta: {
      title: "Marca do veículo",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Marca do veículo" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-32">
          {displayValue(row.original.vehicle?.brand)}
        </p>
      );
    },
  },
  {
    accessorKey: "vehicle_model",
    accessorFn: (row) => row.vehicle?.model,
    meta: {
      title: "Modelo do veículo",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Modelo do veículo" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-32">
          {displayValue(row.original.vehicle?.model)}
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
          {displayValue(row.getValue("driverId"))}
        </p>
      );
    },
  },
  {
    accessorKey: "driver_name",
    accessorFn: (row) => row.driver?.name,
    meta: {
      title: "Nome do motorista",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome do motorista" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-32">
          {displayValue(row.original.driver?.name)}
        </p>
      );
    },
  },
  {
    accessorKey: "driver_cnh",
    accessorFn: (row) => row.driver?.cnh,
    meta: {
      title: "CNH do motorista",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="CNH do motorista" />
    ),
    cell: ({ row }) => {
      return (
        <p className="truncate font-medium w-32">
          {displayValue(row.original.driver?.cnh)}
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
          {displayValue(row.getValue("notes"))}
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
        <Badge variant="outline" className={overallConditionColors[condition]}>
          {overallConditionLabels[condition] || condition || "N/A"}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "ai_verification_status",
    meta: {
      title: "Verificação IA",
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Verificação IA" />
    ),
    cell: ({ row }) => (
      <ChecklistAIStatusCell
        recordId={row.original.id}
        aiStatus={row.original.ai_verification_status ?? null}
      />
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
    cell: ({ row }) => <DataTableVehicleChecklistRowActions row={row} />,
  },
];

export { tableVehicleChecklistColumns };
