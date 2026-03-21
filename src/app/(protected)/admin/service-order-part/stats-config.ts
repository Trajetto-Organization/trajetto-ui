"use client";

import { Package, DollarSign, Percent, TrendingUp } from "lucide-react";
import type { StatConfig } from "@/app/(protected)/_components/shared/stats/shared/common.types";

/**
 * Setting up statistics for the parts by work order page
 *
 * This file defines which statistics will be displayed and how.
 * You can easily add, remove, or modify stats here.
 */
const serviceOrderPartStats: StatConfig[] = [
  {
    key: "total-items",
    title: "Total de Itens",
    valueKey: "totalItems",
    description: "Peças utilizadas em OS",
    icon: Package,
    variant: "primary",
  },
  {
    key: "total-value",
    title: "Valor Total",
    valueKey: "totalValue",
    icon: DollarSign,
    variant: "warning",
    description: "Com descontos aplicados",
  },
  {
    key: "with-discount",
    title: "Com Desconto",
    valueKey: "withDiscount",
    icon: Percent,
    variant: "success",
    calculateValue: (data) => {
      const total = data.totalItems || 0;
      const withDiscount = data.withDiscount || 0;

      return total > 0
        ? `${withDiscount} (${Math.round((withDiscount / total) * 100)}%)`
        : "0";
    },
    description: "Itens com desconto",
  },
  {
    key: "average-value",
    title: "Valor Médio",
    valueKey: "averageValue",
    icon: TrendingUp,
    variant: "primary",
    description: "Por item",
  },
];

export { serviceOrderPartStats };
