"use client";

import { Building2, Store, Code, MapPinned } from "lucide-react";
import type { StatConfig } from "@/app/(protected)/_components/shared/stats/shared/common.types";

/**
 * Setting up statistics for the branches page (Dashboard)
 *
 * This file defines which statistics will be displayed and how.
 * You can easily add, remove, or modify stats here.
 */
const branchStats: StatConfig[] = [
  {
    key: "total-branches",
    title: "Total de Filiais",
    valueKey: "totalBranches",
    description: "Cadastradas no sistema",
    icon: Building2,
    variant: "primary",
  },
  {
    key: "with-erp",
    title: "Com Código ERP",
    valueKey: "withErpCode",
    icon: Code,
    variant: "success",
    calculateValue: (data) => {
      const total = data.totalBranches || 0;
      const withErp = data.withErpCode || 0;

      return total > 0
        ? `${withErp} (${Math.round((withErp / total) * 100)}%)`
        : "0";
    },
    description: "Integradas com ERP",
  },
  {
    key: "with-fantasy-name",
    title: "Com Nome Fantasia",
    valueKey: "withFantasyName",
    icon: Store,
    variant: "primary",
    calculateValue: (data) => {
      const total = data.totalBranches || 0;
      const withFantasy = data.withFantasyName || 0;

      return total > 0
        ? `${withFantasy} (${Math.round((withFantasy / total) * 100)}%)`
        : "0";
    },
    description: "Nome fantasia cadastrado",
  },
  {
    key: "with-complement",
    title: "Com Complemento",
    valueKey: "withComplement",
    icon: MapPinned,
    variant: "warning",
    calculateValue: (data) => {
      const total = data.totalBranches || 0;
      const withComp = data.withComplement || 0;

      return total > 0
        ? `${withComp} (${Math.round((withComp / total) * 100)}%)`
        : "0";
    },
    description: "Endereço complementado",
  },
];

export { branchStats };
