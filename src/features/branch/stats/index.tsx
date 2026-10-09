"use client";

import { Building2, CheckCircle2, Code, Store } from "lucide-react";

import { PageStats } from "@/app/(protected)/_components/shared/stats/page-stats";
import type { StatConfig } from "@/app/(protected)/_components/shared/stats/shared/common.types";

import type { BranchSearchMeta } from "../lib/server-table";
import { branchStatsData, countWithShare } from "../lib/stats-data";

const branchStats: StatConfig[] = [
  {
    key: "total-branches",
    title: "Total de Filiais",
    valueKey: "totalBranches",
    description: "Na busca e nos filtros atuais",
    icon: Building2,
    variant: "primary",
  },
  {
    key: "active-branches",
    title: "Ativas",
    valueKey: "active",
    icon: CheckCircle2,
    variant: "success",
    calculateValue: (data) =>
      countWithShare(data.active || 0, data.activeBase || 0),
    description: "Disponíveis nos cadastros",
  },
  {
    key: "with-erp",
    title: "Com Código ERP",
    valueKey: "withErpCode",
    icon: Code,
    variant: "primary",
    calculateValue: (data) =>
      countWithShare(data.withErpCode || 0, data.totalBranches || 0),
    description: "Integradas com ERP",
  },
  {
    key: "with-fantasy-name",
    title: "Com Nome Fantasia",
    valueKey: "withFantasyName",
    icon: Store,
    variant: "warning",
    calculateValue: (data) =>
      countWithShare(data.withFantasyName || 0, data.totalBranches || 0),
    description: "Nome fantasia cadastrado",
  },
];

/**
 * Client side because the stat configs carry icon components; the numbers
 * are the API's over the whole company (decision 8.8).
 */
const BranchStats = ({
  searchMeta,
}: {
  searchMeta: BranchSearchMeta | undefined;
}): JSX.Element => (
  <PageStats
    stats={branchStats}
    data={branchStatsData(searchMeta) as unknown as Record<string, number>}
    columns={4}
  />
);

export { BranchStats };
