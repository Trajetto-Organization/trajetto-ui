"use client";

import {
  CheckCircle2,
  DollarSign,
  FileText,
  Fuel as FuelIcon,
} from "lucide-react";

import { PageStats } from "@/app/(protected)/_components/shared/stats/page-stats";
import type { StatConfig } from "@/app/(protected)/_components/shared/stats/shared/common.types";

import { buildFuelStatsData, verifiedShare } from "../lib/stats-data";
import type { FuelListSearchMeta } from "../lib/server-table";

/**
 * The four cards, over the whole filtered set (the API's `searchMeta`), the
 * same on /admin and /dashboard. On the client because the configs carry
 * icon components.
 */
const FUEL_STATS: StatConfig[] = [
  {
    key: "total-refuelings",
    title: "Total de Abastecimentos",
    valueKey: "totalRefuelings",
    description: "No filtro atual",
    icon: FileText,
    variant: "primary",
  },
  {
    key: "total-liters",
    title: "Total de Litros",
    valueKey: "totalLiters",
    icon: FuelIcon,
    variant: "primary",
    description: "Litros abastecidos no filtro",
  },
  {
    key: "total-amount",
    title: "Valor Total",
    valueKey: "totalAmount",
    icon: DollarSign,
    variant: "warning",
    description: "Gasto no filtro",
  },
  {
    key: "verified-odometer",
    title: "Odômetro Verificado",
    valueKey: "verifiedOdometer",
    icon: CheckCircle2,
    variant: "success",
    calculateValue: verifiedShare,
    description: "Com odômetro verificado",
  },
];

interface FuelStatsProps {
  total: number;
  searchMeta?: FuelListSearchMeta;
}

const FuelStats = ({ total, searchMeta }: FuelStatsProps): JSX.Element => (
  <PageStats
    stats={FUEL_STATS}
    data={buildFuelStatsData(total, searchMeta)}
    columns={4}
  />
);

export { FuelStats, FUEL_STATS };
