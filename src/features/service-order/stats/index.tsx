"use client";

import { CheckCircle2, Clock, DollarSign, FileText } from "lucide-react";

import { PageStats } from "@/app/(protected)/_components/shared/stats/page-stats";
import type { StatConfig } from "@/app/(protected)/_components/shared/stats/shared/common.types";

import type { ServiceOrderSearchMeta } from "../server-table";
import { percentOf, serviceOrderStatsData } from "../lib/stats-data";

/**
 * The cards of the service order list. On the client because the configs
 * carry icon components.
 */
const SERVICE_ORDER_STATS: StatConfig[] = [
  {
    key: "total-service-orders",
    title: "Total de Ordens",
    valueKey: "totalServiceOrders",
    description: "Da busca e dos filtros, exceto situação",
    icon: FileText,
    variant: "primary",
  },
  {
    key: "open-orders",
    title: "Ordens Abertas",
    valueKey: "openOrders",
    icon: Clock,
    variant: "warning",
    calculateValue: (data) =>
      percentOf(
        Number(data.openOrders) || 0,
        Number(data.totalServiceOrders) || 0,
      ),
    description: "Sem data de conclusão",
  },
  {
    key: "completed-orders",
    title: "Ordens Concluídas",
    valueKey: "completedOrders",
    icon: CheckCircle2,
    variant: "success",
    calculateValue: (data) =>
      percentOf(
        Number(data.completedOrders) || 0,
        Number(data.totalServiceOrders) || 0,
      ),
    description: "Com data de conclusão",
  },
  {
    key: "total-amount",
    title: "Valor Total",
    valueKey: "totalAmount",
    icon: DollarSign,
    variant: "primary",
    description: "Das ordens que a tabela mostra",
  },
];

const ServiceOrderStats = ({
  searchMeta,
}: {
  searchMeta?: ServiceOrderSearchMeta;
}): JSX.Element => (
  <PageStats
    stats={SERVICE_ORDER_STATS}
    data={{ ...serviceOrderStatsData(searchMeta) }}
    columns={4}
  />
);

export { ServiceOrderStats };
