"use client";

import { Building2, Code, MapPin, Users } from "lucide-react";

import { PageStats } from "@/app/(protected)/_components/shared/stats/page-stats";
import type { StatConfig } from "@/app/(protected)/_components/shared/stats/shared/common.types";

import type { BusinessSearchMeta } from "../lib/server-table";
import { businessStatsData } from "../lib/stats-data";

const businessStats: StatConfig[] = [
  {
    key: "total-business",
    title: "Total de Empresas",
    valueKey: "totalBusiness",
    description: "Na busca e nos filtros atuais",
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
      const total = Number(data.totalBusiness) || 0;
      const withErp = Number(data.withErpCode) || 0;

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

/**
 * Client side because the stat configs carry icon components; the numbers
 * are the API's over every company (decision 8.8), never the page's.
 */
const BusinessStats = ({
  searchMeta,
}: {
  searchMeta: BusinessSearchMeta | undefined;
}): JSX.Element => (
  <PageStats
    stats={businessStats}
    data={businessStatsData(searchMeta) as unknown as Record<string, number>}
    columns={4}
  />
);

export { BusinessStats };
