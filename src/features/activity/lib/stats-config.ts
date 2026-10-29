"use client";

import { Activity, Trash2, UserCheck, Layers } from "lucide-react";

import type { StatConfig } from "@/app/(protected)/_components/shared/stats/shared/common.types";
import type { ActivitySummaryData } from "@/actions/activity/get-activity-summary";

/**
 * The four questions someone opening the activity screen actually has:
 * how much happened, was anything destroyed, who was working, and where.
 * All four come from the API aggregate over the whole period.
 */
const activityStats: StatConfig[] = [
  {
    key: "total-activities",
    title: "Ações no Período",
    valueKey: "total",
    description: "Registros na janela selecionada",
    icon: Activity,
    variant: "primary",
  },
  {
    key: "deleted-activities",
    title: "Exclusões",
    valueKey: "deleted",
    icon: Trash2,
    variant: "danger",
    calculateValue: (data) => {
      const total = data.total || 0;
      const deleted = data.deleted || 0;

      return total > 0
        ? `${deleted} (${Math.round((deleted / total) * 100)}%)`
        : "0";
    },
    description: "Registros removidos do sistema",
  },
  {
    key: "active-users",
    title: "Usuários Ativos",
    valueKey: "activeUsers",
    icon: UserCheck,
    variant: "success",
    description: "Pessoas que agiram no período",
  },
  {
    key: "top-type",
    title: "Módulo Mais Ativo",
    valueKey: "topTypeCount",
    icon: Layers,
    variant: "warning",
    description: "Onde a operação se concentrou",
  },
];

/** Maps the API payload into the keys the cards read. */
function buildActivityStatsData(
  summary: ActivitySummaryData | null,
): Record<string, number | string> {
  if (!summary) {
    return { total: 0, deleted: 0, activeUsers: 0, topTypeCount: 0 };
  }

  return {
    total: summary.total,
    created: summary.created,
    updated: summary.updated,
    deleted: summary.deleted,
    activeUsers: summary.activeUsers,
    topTypeCount: summary.topType
      ? `${summary.topType} (${summary.topTypeCount})`
      : "—",
  };
}

export { activityStats, buildActivityStatsData };
