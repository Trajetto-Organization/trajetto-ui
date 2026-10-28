"use client";

import { ColumnDef, Row } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { getRecordOriginMeta } from "@/lib/record-origin";

import { vehicleChecklistTableSchema } from "@/schemas/vehicle-checklist-table-schema";
import { DataTableColumnHeader } from "@/app/(protected)/_components/shared/tanstack-table/data-table-collumn-header";

import { formatNotificationDate, displayValue } from "@/lib/format-values";
import { formatPickedDay } from "@/features/vehicle/lib/presentation";

import { useAIVerificationStore } from "@/store/ai-verification-store";

import { checklistAIStatusBadge } from "./lib/ai-status";

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

/**
 * The AI verdict, live while an analysis runs; the badge's text and colour
 * come from checklistAIStatusBadge (tested).
 */
const ChecklistAIStatusCell = ({
  recordId,
  aiStatus,
  aiDetails,
}: {
  recordId: string;
  aiStatus: string | null;
  aiDetails: unknown;
}) => {
  const realtimeEvent = useAIVerificationStore((s) =>
    s.verifications.get(recordId),
  );

  const badge = checklistAIStatusBadge(
    { ai_verification_status: aiStatus, ai_verification_details: aiDetails },
    realtimeEvent,
  );

  return (
    <Badge variant="outline" className={badge.className} title={badge.title}>
      {badge.label}
    </Badge>
  );
};

interface BuildVehicleChecklistColumnsOptions {
  renderRowActions: (row: Row<vehicleChecklistTableSchema>) => JSX.Element;
}

/**
 * The one checklist table, for /admin and /dashboard (decision 8.7): every
 * list is one company's, so there are no company columns. Column ids are the
 * API's sort keys and facet ids (server-table.ts); what sorts and filters is
 * the server's answer for the whole company (decision 8.8), so no column
 * filters rows here.
 */
function buildVehicleChecklistColumns({
  renderRowActions,
}: BuildVehicleChecklistColumnsOptions): ColumnDef<vehicleChecklistTableSchema>[] {
  return [
    {
      // A checklist is told apart by the vehicle and the day (the column
      // after this one); it has no number of its own.
      accessorKey: "vehicle_license_plate",
      accessorFn: (row) => row.vehicle?.license_plate,
      meta: {
        title: "Placa",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Placa" />
      ),
      cell: ({ row }) => {
        return (
          <p className="truncate font-medium w-28">
            {displayValue(row.original.vehicle?.license_plate)}
          </p>
        );
      },
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
            {displayValue(formatPickedDay(row.getValue("checklist_date")))}
          </p>
        );
      },
      enableHiding: false,
    },
    {
      accessorKey: "created_from",
      meta: {
        title: "Origem",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Origem" />
      ),
      cell: ({ row }) => {
        const origin = getRecordOriginMeta(row.original.created_from);

        return (
          <Badge variant="outline" className={origin.className}>
            {origin.label}
          </Badge>
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
            {mileage ? `${mileage.toLocaleString("pt-BR")} km` : "N/A"}
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
          <Badge
            variant="outline"
            className={overallConditionColors[condition]}
          >
            {overallConditionLabels[condition] || condition || "N/A"}
          </Badge>
        );
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
          aiDetails={row.original.ai_verification_details ?? null}
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
      cell: ({ row }) => renderRowActions(row),
    },
  ];
}

export { buildVehicleChecklistColumns };
