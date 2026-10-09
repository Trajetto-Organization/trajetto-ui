"use client";

import { DollarSign, Package, Percent, TrendingUp } from "lucide-react";

import { PageStats } from "@/app/(protected)/_components/shared/stats/page-stats";
import type { StatConfig } from "@/app/(protected)/_components/shared/stats/shared/common.types";

import {
  orderPartStatsData,
  type OrderPartSearchMeta,
} from "../lib/order-part-rules";

const ORDER_PART_STATS: StatConfig[] = [
  {
    key: "total-items",
    title: "Total de Lançamentos",
    valueKey: "totalItems",
    description: "Peças lançadas em ordens de serviço",
    icon: Package,
    variant: "primary",
  },
  {
    key: "total-value",
    title: "Valor Total",
    valueKey: "totalValue",
    description: "Com os descontos aplicados",
    icon: DollarSign,
    variant: "success",
  },
  {
    key: "with-discount",
    title: "Com Desconto",
    valueKey: "withDiscount",
    description: "Lançamentos com desconto",
    icon: Percent,
    variant: "warning",
  },
  {
    key: "average-value",
    title: "Valor Médio",
    valueKey: "averageValue",
    description: "Por lançamento",
    icon: TrendingUp,
    variant: "primary",
  },
];

const OrderPartStats = ({
  searchMeta,
}: {
  searchMeta?: OrderPartSearchMeta;
}): JSX.Element => (
  <PageStats
    stats={ORDER_PART_STATS}
    data={{ ...orderPartStatsData(searchMeta) }}
    columns={4}
  />
);

export { OrderPartStats };
