"use client";

import { Building2, MapPin, Code, Users } from "lucide-react";
import { StatConfig } from "../../_components/stats/page-stats";

/**
 * Calculates stats directly from the returned data
 *
 * This file defines which statistics will be displayed and how.
 * You can easily add, remove, or modify stats here.
 */
const businessStats: StatConfig[] = [
  {
    key: "total-business",
    title: "Total de Empresas",
    valueKey: "totalBusiness",
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
      const total = data.totalBusiness || 0;
      const withErp = data.withErpCode || 0;

      return total > 0
        ? `${withErp} (${Math.round((withErp / total) * 100)}%)`
        : "0";
    },
    description: "Integradas com ERP",
  },
  {
    key: "by-state",
    title: "Por Estado",
    valueKey: "topStates",
    icon: MapPin,
    variant: "primary",
    description: "Principais estados",
  },
  {
    key: "by-city",
    title: "Por Cidade",
    valueKey: "topCities",
    icon: Users,
    variant: "warning",
    description: "Principais cidades",
  },
];

export { businessStats };
