"use client";

import { Package, DollarSign, TrendingUp, Building2 } from "lucide-react";
import type { StatConfig } from "@/app/(protected)/_components/shared/stats/shared/common.types";

/**
 * Statistics setup for parts page
 *
 * This file defines which statistics will be displayed and how.
 * You can easily add, remove, or modify stats here.
 */
const partStats: StatConfig[] = [
  {
    key: "total-parts",
    title: "Total de Peças",
    valueKey: "totalParts",
    description: "Cadastradas no sistema",
    icon: Package,
    variant: "primary",
  },
  {
    key: "average-price",
    title: "Preço Médio",
    valueKey: "averagePrice",
    icon: TrendingUp,
    variant: "primary",
    description: "Valor médio por peça",
  },
  {
    key: "with-supplier",
    title: "Com Fornecedor",
    valueKey: "withSupplier",
    icon: Building2,
    variant: "success",
    calculateValue: (data) => {
      const total = data.totalParts || 0;
      const withSupplier = data.withSupplier || 0;

      return total > 0
        ? `${withSupplier} (${Math.round((withSupplier / total) * 100)}%)`
        : "0";
    },
    description: "Peças com fornecedor",
  },
  {
    key: "total-value",
    title: "Valor Total",
    valueKey: "totalValue",
    icon: DollarSign,
    variant: "warning",
    description: "Estimativa de estoque",
  },
];

export { partStats };
