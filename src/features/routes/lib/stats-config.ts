"use client";

import { CheckCircle2, ClipboardList, Route, Truck } from "lucide-react";

import type { StatConfig } from "@/app/(protected)/_components/shared/stats/shared/common.types";
import type { RouteStatus } from "./status";

/**
 * The numbers come from the API's status tally, never from the page on
 * screen — a card that counts the current page reports ten rows as if they
 * were the whole operation, and changes every time the user pages.
 */
const routeStats: StatConfig[] = [
  {
    key: "total-routes",
    title: "Total de Rotas",
    valueKey: "totalRoutes",
    description: "Todos os status, na busca e nos filtros",
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
 * top level of the envelope. The API counts it with the search and every
 * filter except the status one (decision 8.8), so picking a status narrows
 * the table without zeroing the other cards.
 *
 * The total is the sum of that same tally, never the pager's `meta.total`:
 * the pager counts WITH the status filter, and mixing the two sets made
 * "Concluídas" read "3 (150%)" once a status was picked.
 *
 * "Liberada" is folded into "Aguardando liberação" deliberately — a released
 * route has not left either, and four cards is what fits. The status filter is
 * where the two are told apart.
 */
function buildStatsData(
  searchMeta:
    { statusCounts?: Partial<Record<RouteStatus, number>> } | undefined,
): Record<string, number> {
  const counts = searchMeta?.statusCounts ?? {};

  const count = (status: RouteStatus): number => Number(counts[status] ?? 0);

  return {
    totalRoutes: Object.values(counts).reduce(
      (sum, value) => sum + Number(value ?? 0),
      0,
    ),
    planned: count("PLANNED") + count("RELEASED"),
    inProgress: count("IN_PROGRESS"),
    completed: count("COMPLETED"),
  };
}

export { buildStatsData, routeStats };
