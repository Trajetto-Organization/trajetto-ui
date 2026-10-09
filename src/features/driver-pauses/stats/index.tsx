"use client";

import { AlertTriangle, CalendarDays, Coffee, UsersRound } from "lucide-react";

import { PageStats } from "@/app/(protected)/_components/shared/stats/page-stats";
import type { StatConfig } from "@/app/(protected)/_components/shared/stats/shared/common.types";

import type { PauseReportSearchMeta } from "../types";

/**
 * The cards read the API's counts for the whole period and filters
 * (decision 8.8), never the rows on screen. "Dias com alerta" leaves the
 * alert filter out on purpose (disjunctive rule): choosing one alert must
 * not turn the card into the table's own total.
 */
const pauseStats: StatConfig[] = [
  {
    key: "days",
    title: "Dias de jornada",
    valueKey: "days",
    description: "Motorista e dia, no período e nos filtros",
    icon: CalendarDays,
    variant: "primary",
  },
  {
    key: "drivers",
    title: "Motoristas",
    valueKey: "drivers",
    description: "Com rota ou pausa no período",
    icon: UsersRound,
    variant: "default",
  },
  {
    key: "pauses",
    title: "Pausas registradas",
    valueKey: "pauses",
    description: "Refeição, descanso e outras",
    icon: Coffee,
    variant: "success",
  },
  {
    key: "alerts",
    title: "Dias com alerta",
    valueKey: "daysWithAlerts",
    description: "Pela Lei 13.103/2015; só sinaliza",
    icon: AlertTriangle,
    variant: "warning",
  },
];

interface DriverPausesStatsProps {
  searchMeta?: PauseReportSearchMeta;
}

const DriverPausesStats = ({
  searchMeta,
}: DriverPausesStatsProps): JSX.Element => (
  <PageStats
    stats={pauseStats}
    data={{
      days: searchMeta?.days ?? 0,
      drivers: searchMeta?.drivers ?? 0,
      pauses: searchMeta?.pauses ?? 0,
      daysWithAlerts: searchMeta?.daysWithAlerts ?? 0,
    }}
    columns={4}
  />
);

export { DriverPausesStats, pauseStats };
