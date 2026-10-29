"use client";

import { Car, CheckCircle2, Navigation, XCircle } from "lucide-react";

import { PageStats } from "@/app/(protected)/_components/shared/stats/page-stats";
import type { StatConfig } from "@/app/(protected)/_components/shared/stats/shared/common.types";

import { useAuthStore } from "@/store/auth-store";

import type { VehicleListSearchMeta } from "../types";
import { asShare, showsInRouteStat, vehicleStatsData } from "../lib/stats";

const VEHICLE_STATS: StatConfig[] = [
  {
    key: "total-vehicles",
    title: "Total de Veículos",
    valueKey: "totalVehicles",
    description: "Na busca e nos filtros atuais",
    icon: Car,
    variant: "primary",
    calculateValue: (data) =>
      data.totalVehicles === undefined ? "—" : String(data.totalVehicles),
  },
  {
    key: "active-vehicles",
    title: "Veículos Ativos",
    valueKey: "activeVehicles",
    icon: CheckCircle2,
    variant: "success",
    calculateValue: (data) => asShare(data.activeVehicles, data.totalVehicles),
    description: "Em operação",
  },
  {
    key: "in-route",
    title: "Em Rota",
    valueKey: "inRoute",
    icon: Navigation,
    variant: "primary",
    calculateValue: (data) => asShare(data.inRoute, data.totalVehicles),
    description: "Com rota em andamento",
  },
  {
    key: "out-of-operation",
    title: "Fora de Operação",
    valueKey: "outOfOperation",
    icon: XCircle,
    variant: "danger",
    calculateValue: (data) => asShare(data.outOfOperation, data.totalVehicles),
    description: "Inativos e bloqueados",
  },
];

interface VehicleStatsProps {
  searchMeta?: VehicleListSearchMeta;
  total: number;
}

/** On the client: the configs carry icons and functions. */
const VehicleStats = ({
  searchMeta,
  total,
}: VehicleStatsProps): JSX.Element => {
  const role = useAuthStore((state) => state.role);
  const enabledModules = useAuthStore((state) => state.enabledModules);
  const stats = showsInRouteStat({ role, enabledModules })
    ? VEHICLE_STATS
    : VEHICLE_STATS.filter((stat) => stat.key !== "in-route");

  return (
    <PageStats
      stats={stats}
      data={{ ...vehicleStatsData(searchMeta, total) }}
      columns={stats.length === 3 ? 3 : 4}
    />
  );
};

export { VehicleStats };
