"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  XCircle,
} from "lucide-react";

import { PageStats } from "@/app/(protected)/_components/shared/stats/page-stats";
import type { StatConfig } from "@/app/(protected)/_components/shared/stats/shared/common.types";

import { asShare } from "@/features/vehicle/lib/stats";

import type { ChecklistSearchMeta } from "./server-table";

/**
 * The cards read the API's tally over the company (FLEET-STATS-1): they used
 * to count "Condição boa" among the ten rows loaded, and changed with every
 * page. Counted without the condition filter, so picking "Reprovado" narrows
 * the table without zeroing the other cards.
 */
function checklistStatsData(searchMeta: ChecklistSearchMeta | undefined) {
  return {
    total: searchMeta?.total,
    approved: searchMeta?.approved,
    approvedWithRestrictions: searchMeta?.approvedWithRestrictions,
    rejected: searchMeta?.rejected,
  };
}

const CHECKLIST_STATS: StatConfig[] = [
  {
    key: "total-checklists",
    title: "Total de Checklists",
    valueKey: "total",
    description: "Na busca e nos filtros atuais",
    icon: ClipboardList,
    variant: "primary",
    calculateValue: (data) =>
      data.total === undefined ? "—" : String(data.total),
  },
  {
    key: "approved",
    title: "Aprovados",
    valueKey: "approved",
    icon: CheckCircle2,
    variant: "success",
    calculateValue: (data) => asShare(data.approved, data.total),
    description: "Veículo liberado",
  },
  {
    key: "approved-with-restrictions",
    title: "Com Restrições",
    valueKey: "approvedWithRestrictions",
    icon: AlertTriangle,
    variant: "warning",
    calculateValue: (data) =>
      asShare(data.approvedWithRestrictions, data.total),
    description: "Atenção necessária",
  },
  {
    key: "rejected",
    title: "Reprovados",
    valueKey: "rejected",
    icon: XCircle,
    variant: "danger",
    calculateValue: (data) => asShare(data.rejected, data.total),
    description: "Veículo não liberado",
  },
];

const ChecklistStats = ({
  searchMeta,
}: {
  searchMeta?: ChecklistSearchMeta;
}): JSX.Element => (
  <PageStats
    stats={CHECKLIST_STATS}
    data={checklistStatsData(searchMeta)}
    columns={4}
  />
);

export { ChecklistStats, checklistStatsData };
