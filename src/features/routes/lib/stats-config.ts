"use client";

import { CheckCircle2, ClipboardList, Route, Truck } from "lucide-react";

import type { StatConfig } from "@/app/(protected)/_components/shared/stats/shared/common.types";
import type { RouteStatus } from "./status";

/**
 * The numbers come from the API's status tally over the FILTERED set, never
 * from the page on screen — a card that counts the current page reports ten
 * rows as if they were the whole operation, and changes every time the user
 * pages.
 */
const routeStats: StatConfig[] = [
  {
    key: "total-routes",
    title: "Total de Rotas",
    valueKey: "totalRoutes",
    description: "No filtro atual",
    icon: Route,
    variant: "primary",
  },
  {
    key: "planned",
    title: "Aguardando liberação",
    valueKey: "planned",
    icon: ClipboardList,
    variant: "default",
    description: "Ainda em planejamento",
  },
  {
    key: "in-progress",
    title: "Em andamento",
    valueKey: "inProgress",
    icon: Truck,
    variant: "primary",
    description: "Motoristas na rua agora",
  },
  {
    key: "completed",
    title: "Concluídas",
    valueKey: "completed",
    icon: CheckCircle2,
    variant: "success",
    calculateValue: (data) => {
      const total = data.totalRoutes || 0;
      const completed = data.completed || 0;

      return total > 0
        ? `${completed} (${Math.round((completed / total) * 100)}%)`
        : "0";
    },
    description: "Todas as paradas resolvidas",
  },
];

/**
 * `searchMeta.statusCounts` is where the tally lands: sendAsNDJSON nests
 * whatever the use case returned in `meta` under that key, so it is NOT at the
 * top level of the envelope.
 *
 * "Liberada" is folded into "Aguardando liberação" deliberately — a released
 * route has not left either, and four cards is what fits. The status filter is
 * where the two are told apart.
 */
function buildStatsData(
  total: number,
  searchMeta: Record<string, unknown> | undefined,
): Record<string, number> {
  const counts = (searchMeta?.statusCounts ?? {}) as Partial<
    Record<RouteStatus, number>
  >;

  return {
    totalRoutes: Number(total ?? 0),
    planned: Number(counts.PLANNED ?? 0) + Number(counts.RELEASED ?? 0),
    inProgress: Number(counts.IN_PROGRESS ?? 0),
    completed: Number(counts.COMPLETED ?? 0),
  };
}

export { buildStatsData, routeStats };
